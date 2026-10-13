const LIGHTBOX_OVERLAY_ID = 'mrx-lightbox-overlay';
const LIGHTBOX_TRANSITION = 'opacity 0.12s ease';
let lightboxContainer = null, lightboxSlides = [], lightboxIndex = 0, lightboxImgEl = null;
let lightboxPrevBodyOverflow = '', lightboxPrevHtmlOverflow = '';

function handleLightboxKeydown(e) {
    if (hasModifier(e)) return;
    if (e.key === 'Escape') { e.preventDefault(); closeCustomLightbox(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepCustomLightbox(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stepCustomLightbox(-1); }
    else if (e.key === 'Home') { e.preventDefault(); stepCustomLightbox(-Infinity); }
    else if (e.key === 'End') { e.preventDefault(); stepCustomLightbox(Infinity); }
}
function closeCustomLightbox() {
    const el = document.getElementById(LIGHTBOX_OVERLAY_ID);
    if (!el) return; // nothing open: don't clobber the page's own overflow styles
    el.remove();
    document.removeEventListener('keydown', handleLightboxKeydown, true);
    document.documentElement.style.overflow = lightboxPrevHtmlOverflow;
    document.body.style.overflow = lightboxPrevBodyOverflow;
    lightboxContainer = null; lightboxSlides = []; lightboxIndex = 0; lightboxImgEl = null;
}
function setLightboxNavDisabled(btn, disabled) {
    if (!btn) return;
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.3' : '1';
    btn.style.cursor = disabled ? 'default' : 'pointer';
    btn.style.pointerEvents = disabled ? 'none' : 'auto';
}
function renderLightboxSlide() {
    const overlay = document.getElementById(LIGHTBOX_OVERLAY_ID);
    if (!overlay || !lightboxImgEl) return;
    const slide = lightboxSlides[lightboxIndex];
    if (slide) {
        const src = slide.currentSrc || slide.src;
        if (src && src !== lightboxImgEl.src) {
            lightboxImgEl.style.opacity = '0';
            lightboxImgEl.src = src;
            lightboxImgEl.onload = lightboxImgEl.onerror = () => { if (lightboxImgEl) lightboxImgEl.style.opacity = '1'; };
        }
    }
    const hasGallery = lightboxSlides.length > 1;
    overlay.querySelectorAll('[data-mrx-lightbox-nav]').forEach((b) => { b.style.display = hasGallery ? 'flex' : 'none'; });
    setLightboxNavDisabled(overlay.querySelector('[data-mrx-lightbox-nav="prev"]'), lightboxIndex <= 0);
    setLightboxNavDisabled(overlay.querySelector('[data-mrx-lightbox-nav="next"]'), lightboxIndex >= lightboxSlides.length - 1);
    const counter = overlay.querySelector('[data-mrx-lightbox-counter]');
    if (counter) {
        counter.style.display = hasGallery ? 'block' : 'none';
        counter.textContent = `${lightboxIndex + 1} / ${lightboxSlides.length}`;
    }
}
function stepCustomLightbox(direction) {
    if (!lightboxContainer || lightboxSlides.length < 2) return;
    const target = direction === Infinity ? lightboxSlides.length - 1 : direction === -Infinity ? 0 : lightboxIndex + direction;
    if (target < 0 || target > lightboxSlides.length - 1 || target === lightboxIndex) return;
    const stepDir = target > lightboxIndex ? 1 : -1;
    lightboxIndex = target;
    renderLightboxSlide();
    const shadow = findGalleryShadowRoot(lightboxContainer);
    const btn = shadow && shadow.querySelector(stepDir > 0 ? GALLERY_NEXT_SELECTOR : GALLERY_PREV_SELECTOR);
    if (btn) btn.click();
}
function makeLightboxToolbarButton(iconSpec, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.style.cssText = 'all:unset;box-sizing:border-box;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;flex:none;background:rgba(255,255,255,0.08);';
    b.replaceChildren(MRXIcons.el(iconSpec.icon, { size: iconSpec.size }));
    b.addEventListener('mouseenter', () => { b.style.background = 'rgba(255,255,255,0.2)'; });
    b.addEventListener('mouseleave', () => { b.style.background = 'rgba(255,255,255,0.08)'; });
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
    return b;
}
function openCustomLightbox(container, clickedImg) {
    closeCustomLightbox();
    const slides = getGallerySlides(container);
    if (!slides.length) return;
    const clickedIndex = clickedImg ? slides.indexOf(clickedImg) : -1;
    const startIndex = clickedIndex !== -1 ? clickedIndex : getVisibleSlideIndex(slides, container);
    const startSrc = slides[startIndex].currentSrc || slides[startIndex].src;
    if (!startSrc || startSrc.startsWith('data:')) return;
    lightboxContainer = container; lightboxSlides = slides; lightboxIndex = startIndex;

    const overlay = document.createElement('div');
    overlay.id = LIGHTBOX_OVERLAY_ID;
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;margin:0;padding:0;border:none;z-index:2147483647;background:rgba(0,0,0,0.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;overflow:hidden;';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCustomLightbox(); });

    const img = document.createElement('img');
    lightboxImgEl = img;
    img.setAttribute('data-mrx-lightbox-img', '1');
    img.src = startSrc;
    img.alt = '';
    img.style.cssText = `max-width:98vw;max-height:96vh;width:auto;height:auto;object-fit:contain;user-select:none;pointer-events:none;transition:${LIGHTBOX_TRANSITION};`;
    overlay.appendChild(img);

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'position:fixed;top:16px;right:64px;display:flex;gap:6px;align-items:center;background:rgba(20,20,20,0.85);padding:6px;border-radius:999px;z-index:2147483648;box-shadow:0 4px 20px rgba(0,0,0,0.5);';

    toolbar.appendChild(makeLightboxToolbarButton(
        { icon: 'download', size: 18 },
        'Download image',
        () => {
            const current = resolveMediaUrl(lightboxContainer);
            if (!current) return;
            downloadMedia(current.url, `${mediaFileId(lightboxContainer)}.${guessMediaExtension(current.url, 'jpg')}`);
        }
    ));
    toolbar.appendChild(makeLightboxToolbarButton(
        { icon: 'external-link', size: 18 },
        'Open post',
        () => {
            const post = lightboxContainer && lightboxContainer.closest('shreddit-post');
            const permalink = post && post.getAttribute('permalink');
            if (permalink) window.open(new URL(permalink, location.origin).toString(), '_blank', 'noopener,noreferrer');
            else { const c = resolveMediaUrl(lightboxContainer); if (c) window.open(c.url, '_blank', 'noopener,noreferrer'); }
        }
    ));
    toolbar.appendChild(makeLightboxToolbarButton(
        { icon: 'search', size: 18 },
        'Reverse image search',
        () => {
            const already = toolbar.querySelector(`[${REVERSE_SEARCH_MENU_MARKER}]`);
            closeAllReverseSearchMenus();
            if (already) return;
            const c = resolveMediaUrl(lightboxContainer);
            if (c) buildReverseSearchMenu(toolbar, c.url, '46px', '0');
        }
    ));
    overlay.appendChild(toolbar);

    const closeBtn = makeLightboxToolbarButton(
        { icon: 'x', size: 22 },
        'Close (Esc)',
        () => closeCustomLightbox()
    );
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = '16px';
    closeBtn.style.right = '16px';
    closeBtn.style.zIndex = '2147483649';
    closeBtn.style.background = 'rgba(20,20,20,0.85)';
    overlay.appendChild(closeBtn);

    function navButton(direction, iconSpec) {
        const b = makeLightboxToolbarButton(iconSpec, direction > 0 ? 'Next (→)' : 'Previous (←)', () => stepCustomLightbox(direction));
        b.setAttribute('data-mrx-lightbox-nav', direction > 0 ? 'next' : 'prev');
        b.style.position = 'fixed';
        b.style.top = '50%';
        b.style.transform = 'translateY(-50%)';
        b.style[direction > 0 ? 'right' : 'left'] = '24px';
        b.style.width = '48px';
        b.style.height = '48px';
        b.style.background = 'rgba(20,20,20,0.7)';
        b.style.zIndex = '2147483648';
        b.style.display = 'none';
        return b;
    }
    overlay.appendChild(navButton(-1, { icon: 'chevron-left', size: 22 }));
    overlay.appendChild(navButton(1, { icon: 'chevron-right', size: 22 }));

    const counter = document.createElement('div');
    counter.setAttribute('data-mrx-lightbox-counter', '1');
    counter.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(20,20,20,0.85);color:#fff;font-size:13px;padding:6px 16px;border-radius:999px;display:none;z-index:2147483648;';
    overlay.appendChild(counter);

    lightboxPrevBodyOverflow = document.body.style.overflow;
    lightboxPrevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(overlay);
    document.addEventListener('keydown', handleLightboxKeydown, true);
    renderLightboxSlide();
}
function isSinglePostPageOpen() { return /\/comments\//.test(location.pathname); }
function handleLightboxIntercept(e) {
    if (!currentSettings.discordStyleLightbox) return;
    if (isSinglePostPageOpen()) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    for (const node of path) {
        if (!node || node.nodeType !== 1) continue;
        if (node.id === LIGHTBOX_OVERLAY_ID) return;
        if (node.hasAttribute && (node.hasAttribute(MEDIA_DL_MARKER) || node.hasAttribute(REVERSE_SEARCH_MARKER))) return;
        if (node.tagName === 'BUTTON') return;
    }
    const img = path.find((n) => n && n.nodeType === 1 && n.tagName === 'IMG');
    if (!img) return;
    const container = img.closest('div[slot="post-media-container"]');
    if (!container) return;
    e.preventDefault(); e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    openCustomLightbox(container, img);
}
