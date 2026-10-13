// Long videos stream as HLS, but MP4 renditions sit next to the playlist. Returns the first candidate that exists.

import { isAllowedMediaUrl } from './url-policy.js';

const MAX_CANDIDATES = 24;
const PROBE_TIMEOUT_MS = 8000;

async function exists(url, fetchFn) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        // HEAD first; some CDNs reject it, so a one-byte ranged GET is the fallback.
        let res = await fetchFn(url, { method: 'HEAD', credentials: 'omit', signal: controller.signal });
        if (!res.ok && res.status !== 404 && res.status !== 403) {
            res = await fetchFn(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, credentials: 'omit', signal: controller.signal });
        }
        if (!res.ok) return false;
        const type = (res.headers && res.headers.get('content-type')) || '';
        return !/^text\//i.test(type);
    } catch (e) {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

export async function pickWorkingMediaUrl(candidates, fetchFn = fetch) {
    if (!Array.isArray(candidates)) return null;
    for (const url of candidates.slice(0, MAX_CANDIDATES)) {
        if (typeof url !== 'string' || !isAllowedMediaUrl(url)) continue;
        if (await exists(url, fetchFn)) return url;
    }
    return null;
}
