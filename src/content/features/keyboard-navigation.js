const NAV_CURRENT_MARKER = 'data-mrx-nav-current';
const NAV_HEADER_CLEARANCE_PX = 100;

function isEditableTarget(el) {
    let node = el;
    while (node) {
        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.isContentEditable) return true;
        node = node.shadowRoot ? node.shadowRoot.activeElement : null;
    }
    return false;
}
function getNavPosts() {
    const feed = document.querySelector('shreddit-feed');
    const articles = feed ? feed.querySelectorAll('article:has(shreddit-post)') : [];
    if (articles.length) return Array.from(articles);
    return Array.from(document.querySelectorAll('shreddit-post'));
}
function isNavEligible(el) {
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const inner = el.matches('shreddit-post, shreddit-ad-post') ? el : el.querySelector('shreddit-post, shreddit-ad-post');
    if (inner && window.getComputedStyle(inner).display === 'none') return false;
    return true;
}
function findEligibleIndex(list, start, step) {
    for (let i = start; i >= 0 && i < list.length; i += step) {
        if (isNavEligible(list[i])) return i;
    }
    return -1;
}
function findViewportRelativeIndex(list) {
    let bestIndex = -1, bestDist = Infinity;
    for (let i = 0; i < list.length; i++) {
        if (!isNavEligible(list[i])) continue;
        const rect = list[i].getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        const dist = Math.abs(rect.top - NAV_HEADER_CLEARANCE_PX);
        if (dist < bestDist) { bestDist = dist; bestIndex = i; }
    }
    return bestIndex;
}
function scrollToNavTarget(list, index) {
    if (index < 0 || index >= list.length) return;
    list.forEach((el) => el.removeAttribute(NAV_CURRENT_MARKER));
    const target = list[index];
    target.setAttribute(NAV_CURRENT_MARKER, '1');
    const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEADER_CLEARANCE_PX;
    window.scrollTo({ top, behavior: 'smooth' });
}

function handleArrowKeyNav(e) {
    if (!currentSettings.arrowKeyNav) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (hasModifier(e)) return;
    if (isEditableTarget(document.activeElement)) return;
    const list = getNavPosts();
    if (!list.length) return;
    e.preventDefault();
    const markedIndex = list.findIndex((el) => el.hasAttribute(NAV_CURRENT_MARKER));
    const viewportIndex = findViewportRelativeIndex(list);
    const currentIndex = viewportIndex !== -1 ? viewportIndex : markedIndex;
    const step = e.key === 'ArrowDown' ? 1 : -1;
    scrollToNavTarget(list, currentIndex === -1 ? findEligibleIndex(list, 0, 1) : findEligibleIndex(list, currentIndex + step, step));
}
function getViewportCenterPost(predicate) {
    const posts = Array.from(document.querySelectorAll('shreddit-post')).filter(predicate || (() => true));
    if (!posts.length) return null;
    const viewCenter = window.innerHeight / 2;
    let best = null, bestDist = Infinity;
    for (const post of posts) {
        const rect = post.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        const dist = Math.abs((rect.top + rect.height / 2) - viewCenter);
        if (dist < bestDist) { bestDist = dist; best = post; }
    }
    return best;
}
function getActivePost(predicate) {
    const marked = document.querySelector(`[${NAV_CURRENT_MARKER}]`);
    if (marked) {
        const post = marked.matches('shreddit-post') ? marked : marked.querySelector('shreddit-post');
        if (post && (!predicate || predicate(post))) return post;
    }
    return getViewportCenterPost(predicate);
}
const MEDIA_WOKEN_MARKER = 'data-mrx-media-woken';

function wakeGalleryAndVideoElements(root) {
    if (typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll(`gallery-carousel:not([${MEDIA_WOKEN_MARKER}]), shreddit-player:not([${MEDIA_WOKEN_MARKER}]), shreddit-player-2:not([${MEDIA_WOKEN_MARKER}])`).forEach((el) => {
        el.setAttribute(MEDIA_WOKEN_MARKER, '1');
        nudgeHover(el);
        const container = el.closest('div[slot="post-media-container"]');
        if (container) nudgeHover(container);
    });
}
function findGalleryShadowRoot(scope) {
    if (!scope) return null;
    for (const carousel of scope.querySelectorAll('gallery-carousel')) {
        nudgeHover(carousel);
        if (!carousel.shadowRoot) continue;
        if (carousel.shadowRoot.querySelector(GALLERY_PREV_SELECTOR) || carousel.shadowRoot.querySelector(GALLERY_NEXT_SELECTOR)) return carousel.shadowRoot;
    }
    return null;
}
function getLightboxGalleryShadow() {
    const lightbox = document.querySelector('#shreddit-media-lightbox');
    return lightbox ? findGalleryShadowRoot(lightbox) : null;
}
function handleGalleryArrowKeyNav(e) {
    if (!currentSettings.arrowKeyNav) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (hasModifier(e)) return;
    if (isEditableTarget(document.activeElement)) return;
    let shadow = getLightboxGalleryShadow();
    if (!shadow) {
        const post = getActivePost((p) => findGalleryShadowRoot(p));
        if (!post) return;
        shadow = findGalleryShadowRoot(post);
        if (!shadow) return;
    }
    const selector = e.key === 'ArrowRight' ? GALLERY_NEXT_SELECTOR : GALLERY_PREV_SELECTOR;
    const btn = shadow.querySelector(selector);
    if (!btn) return;
    e.preventDefault();
    btn.click();
}
const VIDEO_SEEK_SECONDS = 5;
function findVideoElement(scope) {
    if (!scope) return null;
    const player = scope.querySelector('shreddit-player, shreddit-player-2');
    if (player) {
        nudgeHover(player);
        const video = player.shadowRoot && player.shadowRoot.querySelector('video');
        if (video) return video;
    }
    return scope.querySelector('video');
}
function getLightboxVideo() {
    const lightbox = document.querySelector('#shreddit-media-lightbox');
    return lightbox ? findVideoElement(lightbox) : null;
}
function handleVideoSeekArrowKeyNav(e) {
    if (!currentSettings.arrowKeyNav) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (hasModifier(e)) return;
    if (e.defaultPrevented) return;
    if (isEditableTarget(document.activeElement)) return;
    let video = getLightboxVideo();
    if (!video) {
        const post = getActivePost((p) => findVideoElement(p));
        if (!post) return;
        video = findVideoElement(post);
        if (!video) return;
    }
    const duration = isFinite(video.duration) ? video.duration : Infinity;
    const delta = e.key === 'ArrowRight' ? VIDEO_SEEK_SECONDS : -VIDEO_SEEK_SECONDS;
    const target = Math.min(Math.max(video.currentTime + delta, 0), duration);
    if (target === video.currentTime) return;
    e.preventDefault();
    video.currentTime = target;
}
function handleEnterKeyOpenPost(e) {
    if (!currentSettings.arrowKeyNav) return;
    if (e.key !== 'Enter') return;
    if (hasModifier(e)) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;
    if (isEditableTarget(active)) return;
    const post = getActivePost();
    if (!post) return;
    const href = post.getAttribute('permalink');
    if (!href) return;
    e.preventDefault();
    window.location.assign(new URL(href, window.location.origin).toString());
}
