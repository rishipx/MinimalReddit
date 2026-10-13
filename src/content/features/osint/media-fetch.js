// forensics/crop/caliper (~57 KB) are injected into the tab on first use.
const utilLoads = new Map();
function ensureUtil(name, globalName) {
    if (window[globalName]) return Promise.resolve(true);
    if (!utilLoads.has(name)) {
        const p = Promise.resolve(browserAPI.runtime.sendMessage({ action: 'mrxInjectUtil', name }))
            .then((r) => !!(r && r.ok && window[globalName]))
            .catch(() => false)
            .then((ok) => { if (!ok) utilLoads.delete(name); return ok; });
        utilLoads.set(name, p);
    }
    return utilLoads.get(name);
}
function decodeBase64(data) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// Pulls a file of any size through the service worker as a stream into a Blob.
function fetchMediaBlob(url) {
    return new Promise((resolve) => {
        let port;
        try { port = browserAPI.runtime.connect({ name: 'mrxFetchStream' }); }
        catch (err) { resolve({ ok: false, error: (err && err.message) || 'messaging error' }); return; }
        const parts = [];
        let contentType = 'application/octet-stream', settled = false;
        const finish = (result) => { if (!settled) { settled = true; resolve(result); try { port.disconnect(); } catch (e) { /* closed */ } } };
        port.onMessage.addListener((m) => {
            if (m.type === 'head') contentType = m.contentType;
            else if (m.type === 'chunk') parts.push(decodeBase64(m.data));
            else if (m.type === 'end') finish({ ok: true, blob: new Blob(parts, { type: contentType }), contentType });
            else if (m.type === 'error') finish({ ok: false, error: m.error });
        });
        port.onDisconnect.addListener(() => finish({ ok: false, error: 'connection lost' }));
        port.postMessage({ url });
    });
}
async function fetchAsDataURL(url) {
    const res = await fetchMediaBlob(url);
    if (!res.ok) return res;
    const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(res.blob);
    });
    return dataUrl ? { ok: true, dataUrl, contentType: res.contentType } : { ok: false, error: 'could not read file' };
}
function triggerDownload(blobOrUrl, filename) {
    // Blob URLs avoid browser limits and base64 memory overhead.
    const objectUrl = blobOrUrl instanceof Blob ? URL.createObjectURL(blobOrUrl) : blobOrUrl;
    const revokeAfterDownload = blobOrUrl instanceof Blob;
    const a = document.createElement('a');
    a.href = objectUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    if (revokeAfterDownload) setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
}
