import { browserAPI } from './browser-api.js';
import { isAllowedMediaUrl } from './url-policy.js';

function arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

// Streams the body to onChunk in ~batchBytes batches so memory stays flat; stops and returns false if onChunk does.
async function readBodyChunks(res, onChunk, batchBytes = 1024 * 1024) {
    if (!res.body || typeof res.body.getReader !== 'function') return onChunk(new Uint8Array(await res.arrayBuffer())) !== false;
    const reader = res.body.getReader();
    let pending = [], size = 0;
    const flush = () => {
        const out = new Uint8Array(size);
        let off = 0;
        for (const c of pending) { out.set(c, off); off += c.byteLength; }
        pending = []; size = 0;
        return onChunk(out);
    };
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        pending.push(value); size += value.byteLength;
        if (size >= batchBytes && (await flush()) === false) { try { await reader.cancel(); } catch (e) { /* ignore */ } return false; }
    }
    return size ? (await flush()) !== false : true;
}

// Sent through a port in batches: one message is capped at tens of MB, a stream isn't.
// The timeout only trips on a stalled transfer, so large videos on slow links still finish.
const STREAM_IDLE_TIMEOUT_MS = 30000;
async function streamMedia(port, url) {
    if (!isAllowedMediaUrl(url)) { port.postMessage({ type: 'error', error: 'url not allowed' }); return; }
    const controller = new AbortController();
    let timer;
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), STREAM_IDLE_TIMEOUT_MS); };
    let open = true;
    port.onDisconnect.addListener(() => { open = false; controller.abort(); });
    try {
        arm();
        const res = await fetch(url, { signal: controller.signal, credentials: 'omit' });
        if (!res.ok) { port.postMessage({ type: 'error', error: `bad response (${res.status})` }); return; }
        port.postMessage({ type: 'head', contentType: res.headers.get('content-type') || 'application/octet-stream' });
        await readBodyChunks(res, (bytes) => {
            if (!open) return false;
            arm();
            port.postMessage({ type: 'chunk', data: arrayBufferToBase64(bytes) });
        });
        if (open) port.postMessage({ type: 'end' });
    } catch (err) {
        if (open) port.postMessage({ type: 'error', error: err && err.name === 'AbortError' ? 'timed out' : ((err && err.message) || 'network error') });
    } finally {
        clearTimeout(timer);
    }
}

export function registerMediaStreamPort() {
    browserAPI.runtime.onConnect.addListener((port) => {
        if (port.name !== 'mrxFetchStream') return;
        port.onMessage.addListener((msg) => { if (msg && msg.url) streamMedia(port, msg.url); });
    });
}
