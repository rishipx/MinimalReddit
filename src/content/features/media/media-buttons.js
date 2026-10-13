const MEDIA_DL_MARKER = 'data-mrx-media-dl';
const REVERSE_SEARCH_MARKER = 'data-mrx-reverse-search';
const REVERSE_SEARCH_MENU_MARKER = 'data-mrx-reverse-search-menu';

const GOOGLE_LENS_MAX_URL_LENGTH = 2000;
function buildGoogleLensUrl(imageUrl) {
    try {
        const parsed = new URL(imageUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) return 'https://lens.google.com/';
        // Chromium's Lens URL-upload entry point; it caps the encoded image URL at 2,000 chars.
        if (encodeURI(parsed.href).length > GOOGLE_LENS_MAX_URL_LENGTH) return 'https://lens.google.com/';
        const lensUrl = new URL('https://lens.google.com/uploadbyurl');
        lensUrl.searchParams.set('url', parsed.href);
        lensUrl.searchParams.set('ep', 'cntpubu');
        lensUrl.searchParams.set('hl', (navigator.language || 'en').split('-').join('_'));
        lensUrl.searchParams.set('re', 'df');
        lensUrl.searchParams.set('s', '4');
        return lensUrl.toString();
    } catch {
        return 'https://lens.google.com/';
    }
}

const REVERSE_SEARCH_ENGINES = [
    { label: 'Google Lens', build: buildGoogleLensUrl },
    { label: 'Yandex Images', build: (u) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(u)}` },
    { label: 'TinEye', build: (u) => `https://tineye.com/search?url=${encodeURIComponent(u)}` },
    { label: 'Bing Visual Search', build: (u) => `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIIRP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(u)}` },
    { label: 'Open image in new tab', build: (u) => u }
];

function closeAllReverseSearchMenus() {
    document.querySelectorAll(`[${REVERSE_SEARCH_MENU_MARKER}]`).forEach((m) => m.remove());
}
function buildReverseSearchMenu(anchor, url, topOffset, rightOffset) {
    const menu = document.createElement('div');
    menu.setAttribute(REVERSE_SEARCH_MENU_MARKER, '1');
    menu.style.cssText = `position:absolute;top:${topOffset};right:${rightOffset};z-index:7;background:rgba(20,20,20,0.95);border-radius:8px;padding:4px;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;flex-direction:column;`;
    REVERSE_SEARCH_ENGINES.forEach((engine) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = engine.label;
        item.style.cssText = 'all:unset;box-sizing:border-box;display:block;width:100%;padding:8px 10px;font-size:12px;color:#fff;cursor:pointer;border-radius:5px;white-space:nowrap;';
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.14)'; });
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
        item.addEventListener('click', (ev) => {
            ev.preventDefault(); ev.stopPropagation();
            window.open(engine.build(url), '_blank', 'noopener,noreferrer');
            closeAllReverseSearchMenus();
        });
        menu.appendChild(item);
    });
    anchor.appendChild(menu);
    return menu;
}
function makeReverseSearchButton(container, rightOffset) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute(REVERSE_SEARCH_MARKER, '1');
    btn.title = 'Reverse image search';
    btn.setAttribute('aria-label', 'Reverse image search');
    btn.style.cssText = `${MRX_OVERLAY_BTN_CSS}right:${rightOffset};`;
    btn.replaceChildren(MRXIcons.el('search', { size: 16 }));
    btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const already = btn.parentElement && btn.parentElement.querySelector(`[${REVERSE_SEARCH_MENU_MARKER}]`);
        closeAllReverseSearchMenus();
        if (already) return;
        // Resolved at click time so the current gallery slide is used.
        const resolved = resolveMediaUrl(container);
        if (!resolved || resolved.kind !== 'image') return;
        if (btn.parentElement) buildReverseSearchMenu(btn.parentElement, resolved.url, '44px', rightOffset);
    });
    return btn;
}
document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && (e.target.closest(`[${REVERSE_SEARCH_MARKER}]`) || e.target.closest(`[${REVERSE_SEARCH_MENU_MARKER}]`))) return;
    closeAllReverseSearchMenus();
});

function makeMediaDownloadButton(container, filenameBase) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute(MEDIA_DL_MARKER, '1');
    btn.title = 'Download';
    btn.setAttribute('aria-label', 'Download media');
    btn.style.cssText = `${MRX_OVERLAY_BTN_CSS}right:8px;`;
    btn.replaceChildren(MRXIcons.el('download', { size: 16 }));
    btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const resolved = resolveMediaUrl(container);
        if (!resolved) return;
        const start = (url) => {
            const ext = guessMediaExtension(url, resolved.kind === 'video' ? 'mp4' : 'jpg');
            downloadMedia(url, `${filenameBase}.${ext}`);
        };
        if (!resolved.candidates) { start(resolved.url); return; }
        pickVideoUrl(resolved).then((url) => {
            if (url) start(url);
            else alert("Couldn't find a downloadable video file for this post.");
        });
    });
    return btn;
}

function applyMediaDownloadButtons(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const wantDl = settings.showMediaDownloadButton;
    const wantRev = settings.showReverseImageSearchButton;
    if (!wantDl) root.querySelectorAll(`[${MEDIA_DL_MARKER}]`).forEach((b) => b.remove());
    if (!wantRev) {
        const rm = root.querySelectorAll(`[${REVERSE_SEARCH_MARKER}]`);
        if (rm.length) { rm.forEach((b) => b.remove()); closeAllReverseSearchMenus(); }
    }
    if (!wantDl && !wantRev) return;
    root.querySelectorAll('div[slot="post-media-container"]').forEach((container) => {
        const needDl = wantDl && !container.querySelector(`[${MEDIA_DL_MARKER}]`);
        const needRev = wantRev && !container.querySelector(`[${REVERSE_SEARCH_MARKER}]`);
        if (!needDl && !needRev) return;
        const resolved = resolveMediaUrl(container);
        if (!resolved) return;
        if (window.getComputedStyle(container).position === 'static') container.style.setProperty('position', 'relative', 'important');
        if (needDl) {
            container.appendChild(makeMediaDownloadButton(container, mediaFileId(container)));
        }
        if (needRev && resolved.kind === 'image') {
            container.appendChild(makeReverseSearchButton(container, wantDl ? '48px' : '8px'));
        }
    });
}
