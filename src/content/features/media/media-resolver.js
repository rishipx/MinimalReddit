function guessMediaExtension(url, fallback) {
    const match = /\.([a-zA-Z0-9]{2,4})(?:[?#]|$)/.exec(url.split('?')[0]);
    return (match && match[1]) || fallback;
}
function downloadMedia(url, filename) {
    const fallbackFetch = () => fetch(url, { mode: 'cors' })
        .then((res) => { if (!res.ok) throw new Error('bad response: ' + res.status); return res.blob(); })
        .then((blob) => {
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl; a.download = filename;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        })
        .catch(() => { window.open(url, '_blank'); });
    try {
        browserAPI.runtime.sendMessage({ action: 'mrxDownload', url, filename })
            .then((r) => { if (!r || !r.ok) fallbackFetch(); }, fallbackFetch);
    } catch (e) { fallbackFetch(); }
}

function decodePackagedMediaJSON(raw) {
    try { return JSON.parse(raw.replace(/&quot;/g, '"')); } catch { return null; }
}
function getBestMp4FromPackagedJSON(container) {
    const raw = container.querySelector('[packaged-media-json]')?.getAttribute('packaged-media-json');
    if (!raw) return null;
    const data = decodePackagedMediaJSON(raw);
    const permutations = data?.playbackMp4s?.permutations;
    if (!Array.isArray(permutations) || !permutations.length) return null;
    const area = (p) => (p?.source?.dimensions?.width || 0) * (p?.source?.dimensions?.height || 0);
    const best = permutations.reduce((a, b) => (area(b) > area(a) ? b : a));
    return (best && best.source && best.source.url) || null;
}
function isDirectVideoUrl(src) {
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) return false;
    if (/\.(m3u8|mpd)(?:[?#]|$)/i.test(src)) return false;
    return true;
}
function getGallerySlides(container) {
    const slides = Array.from(container.querySelectorAll('img.media-lightbox-img'));
    if (slides.length) return slides;
    const single = container.querySelector('img');
    return single ? [single] : [];
}
function getVisibleSlideIndex(slides, container) {
    if (slides.length <= 1) return 0;
    const cRect = container.getBoundingClientRect();
    let bestIndex = 0, bestScore = -1;
    slides.forEach((img, idx) => {
        const r = img.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const ox = Math.max(0, Math.min(r.right, cRect.right) - Math.max(r.left, cRect.left));
        const oy = Math.max(0, Math.min(r.bottom, cRect.bottom) - Math.max(r.top, cRect.top));
        const op = parseFloat(window.getComputedStyle(img).opacity);
        const score = ox * oy * (Number.isNaN(op) ? 1 : op);
        if (score > bestScore) { bestScore = score; bestIndex = idx; }
    });
    return bestIndex;
}
// Short filesystem-safe id for a post's media, used in download filenames.
function mediaFileId(container) {
    const post = container.closest('shreddit-post');
    const rawId = (post && (post.getAttribute('id') || post.getAttribute('permalink'))) || 'reddit-media';
    return String(rawId).replace(/[^a-zA-Z0-9_-]/g, '').slice(-24) || 'reddit-media';
}
function directVideoSrc(video) {
    const source = video.querySelector('source');
    const src = (source && source.src) || video.currentSrc || video.src;
    return isDirectVideoUrl(src) ? src : null;
}
// Long videos are served as HLS (a playlist or blob: URL), which can't be saved as one file. Reddit hosts MP4
// renditions beside the playlist, so candidates are built from the video id and the service worker picks the
// first that exists (pickVideoUrl).
const REDDIT_VIDEO_ID = /v\.redd\.it\/([a-z0-9]+)/i;
const VIDEO_FALLBACK_HEIGHTS = [1080, 720, 480, 360, 240, 144];
function findRedditVideoId(container) {
    const values = [];
    const addAttrs = (el) => { if (el && el.attributes) for (const a of el.attributes) values.push(a.value); };
    addAttrs(container);
    addAttrs(container.closest('shreddit-post'));
    container.querySelectorAll('shreddit-player, shreddit-player-2, video, source, [packaged-media-json]').forEach(addAttrs);
    container.querySelectorAll('video').forEach((v) => values.push(v.currentSrc || '', v.src || ''));
    container.querySelectorAll('shreddit-player, shreddit-player-2').forEach((pl) => {
        const inner = pl.shadowRoot && pl.shadowRoot.querySelector('video');
        if (inner) values.push(inner.currentSrc || '', inner.src || '');
        addAttrs(pl.shadowRoot && pl.shadowRoot.querySelector('video, source'));
    });
    for (const v of values) { const m = REDDIT_VIDEO_ID.exec(v); if (m) return m[1]; }
    return null;
}
function derivedVideoResolution(container) {
    const id = findRedditVideoId(container);
    if (!id) return null;
    const candidates = [];
    for (const h of VIDEO_FALLBACK_HEIGHTS) {
        candidates.push(`https://v.redd.it/${id}/CMAF_${h}.mp4`, `https://v.redd.it/${id}/DASH_${h}.mp4`);
    }
    return { url: candidates[0], kind: 'video', candidates };
}
// Returns a fetchable URL for a resolved video: immediately when it is already a direct file,
// otherwise after the service worker confirms which candidate rendition exists. null if none do.
async function pickVideoUrl(resolved) {
    if (!resolved) return null;
    if (!resolved.candidates) return resolved.url;
    try {
        const r = await browserAPI.runtime.sendMessage({ action: 'mrxResolveVideo', candidates: resolved.candidates });
        return r && r.ok && r.url ? r.url : null;
    } catch (e) { return null; }
}

function resolveMediaUrl(container) {
    const packagedMp4 = getBestMp4FromPackagedJSON(container);
    if (packagedMp4) return { url: packagedMp4, kind: 'video' };
    const player = container.querySelector('shreddit-player, shreddit-player-2');
    if (player) {
        const video = player.shadowRoot && player.shadowRoot.querySelector('video');
        const src = video && directVideoSrc(video);
        if (src) return { url: src, kind: 'video' };
        const attrUrl = player.getAttribute('src') || player.getAttribute('fallback-url') || player.getAttribute('content-href');
        if (isDirectVideoUrl(attrUrl)) return { url: attrUrl, kind: 'video' };
        return derivedVideoResolution(container);
    }
    const video = container.querySelector('video');
    if (video) {
        const src = directVideoSrc(video);
        return src ? { url: src, kind: 'video' } : derivedVideoResolution(container);
    }
    const slides = getGallerySlides(container);
    if (slides.length) {
        const img = slides[getVisibleSlideIndex(slides, container)];
        const src = img.currentSrc || img.src;
        if (src && !src.startsWith('data:')) return { url: src, kind: 'image' };
    }
    return null;
}
