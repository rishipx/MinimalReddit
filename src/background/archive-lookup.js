import { browserAPI } from './browser-api.js';

function normalizeCommentId(rawId) {
    return String(rawId || '').replace(/^t1_/i, '').trim();
}

async function fetchArchive(url, source, pickHit, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (res.status === 429) return { ok: false, code: 'rate_limited' };
        if (!res.ok) return { ok: false, code: 'network_error' };
        const hit = pickHit(await res.json());
        if (!hit || typeof hit.body !== 'string') return { ok: false, code: 'not_found' };
        const body = hit.body.trim();
        // A placeholder isn't recovered text; fall through to the next archive.
        if (!body || /^\[(?:deleted|removed)(?:\s+by\s+reddit)?\]$/i.test(body)) return { ok: false, code: 'not_found' };
        return { ok: true, source, body, author: hit.author || '[unknown]', createdUtc: hit.created_utc || null };
    } catch (err) {
        return { ok: false, code: err && err.name === 'AbortError' ? 'timeout' : 'network_error' };
    } finally {
        clearTimeout(timer);
    }
}

const fetchFromPullPush = (id, timeoutMs) => fetchArchive(
    `https://api.pullpush.io/comment?ids=${encodeURIComponent(id)}`, 'PullPush',
    (json) => (json && Array.isArray(json.data) ? json.data[0] : null), timeoutMs);

const fetchFromArcticShift = (id, timeoutMs) => fetchArchive(
    `https://arctic-shift.photon-reddit.com/api/comments/ids?ids=${encodeURIComponent(id)}`, 'Arctic Shift',
    (json) => (Array.isArray(json) ? json : (json && Array.isArray(json.data) ? json.data : []))[0], timeoutMs);

let archiveQueueTail = Promise.resolve();
const ARCHIVE_MIN_GAP_MS = 1200;
const ARCHIVE_LAST_KEY = 'mrxArchiveLastRequestAt';

// Kept in storage.session so the rate-limit gap survives service-worker restarts.
async function waitForArchiveGap() {
    try {
        const stored = await browserAPI.storage.session.get(ARCHIVE_LAST_KEY);
        const wait = ARCHIVE_MIN_GAP_MS - (Date.now() - (stored[ARCHIVE_LAST_KEY] || 0));
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    } catch (e) { /* session storage unavailable: fall back to the in-memory queue */ }
}
async function markArchiveRequest() {
    try { await browserAPI.storage.session.set({ [ARCHIVE_LAST_KEY]: Date.now() }); } catch (e) { /* ignore */ }
}

function queueArchiveRequest(task) {
    const run = async () => {
        await waitForArchiveGap();
        try { return await task(); } finally { await markArchiveRequest(); }
    };
    const result = archiveQueueTail.then(run, run);
    archiveQueueTail = result.then(() => {}, () => {});
    return result;
}

export async function lookupArchivedComment(rawId) {
    const id = normalizeCommentId(rawId);
    if (!id) return { ok: false, code: 'not_found' };
    return queueArchiveRequest(async () => {
        const first = await fetchFromPullPush(id, 8000);
        if (first.ok) return first;
        const second = await fetchFromArcticShift(id, 8000);
        if (second.ok) return second;
        const codes = [first.code, second.code];
        if (codes.includes('rate_limited')) return { ok: false, code: 'rate_limited' };
        if (codes.includes('timeout')) return { ok: false, code: 'timeout' };
        if (codes.every((c) => c === 'not_found')) return { ok: false, code: 'not_found' };
        return { ok: false, code: 'network_error' };
    });
}
