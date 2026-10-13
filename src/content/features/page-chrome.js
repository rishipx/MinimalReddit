const SNOO_ATTR = 'show-snoo-leading-icon';
const SNOO_REMOVED_MARKER = 'data-mrx-snoo-removed';

function applyHideLogoInSearch(settings) {
    const el = document.querySelector('reddit-search-large');
    if (!el) return;
    if (settings.masterPower && settings.hideSearchbarLogo) {
        if (el.hasAttribute(SNOO_ATTR)) {
            el.removeAttribute(SNOO_ATTR);
            el.setAttribute(SNOO_REMOVED_MARKER, '1');
        }
    } else if (el.hasAttribute(SNOO_REMOVED_MARKER)) {
        // Restore only what this extension removed; never add the attribute to a search bar Reddit rendered without it.
        el.setAttribute(SNOO_ATTR, '');
        el.removeAttribute(SNOO_REMOVED_MARKER);
    }
}

function updateClasses(settings) {
    // <html> exists at document_start (body doesn't), so rules apply before first paint.
    // Namespaced so we never strip Reddit's own "hide-*" classes.
    const root = document.documentElement;
    if (!root) return;
    const MAP = [
        ['hideAds', 'mrx-hide-ads'], ['hideLeftSidebar', 'mrx-hide-left-sidebar'],
        ['hideTopBar', 'mrx-hide-top-bar'], ['hideChat', 'mrx-hide-chat'],
        ['hideNotifications', 'mrx-hide-notifications'], ['hideCreate', 'mrx-hide-create'],
        ['hideAdvertiseButton', 'mrx-hide-advertise-button'],
        ['hideBlurredMediaBackground', 'mrx-hide-blurred-media-bg']
    ];
    const on = settings.masterPower;
    for (const [key, cls] of MAP) root.classList.toggle(cls, on && !!settings[key]);
}

function applyScrollToTop(enabled) {
    let btn = document.getElementById('mrx-scroll-top');
    if (!enabled) { if (btn) btn.remove(); return; }
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'mrx-scroll-top';
        btn.replaceChildren(MRXIcons.el('arrow-up', { size: 16 }));
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;background:#ff4500;color:white;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);transition:opacity 0.2s;opacity:0.35;';
        btn.onmouseover = () => btn.style.opacity = '0.9';
        btn.onmouseout = () => btn.style.opacity = '0.35';
        btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        (document.body || document.documentElement).appendChild(btn);
    }
}

function applyCollapseAutoMod(root, settings) {
    if (!settings.collapseAutoMod || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('shreddit-comment[author="AutoModerator"]:not([data-mrx-automod])').forEach((c) => {
        c.setAttribute('collapsed', 'true');
        c.setAttribute('data-mrx-automod', '1');
    });
}

// With the right sidebar at the window edge it is position:fixed and would cover the subreddit/profile header row.
// Its top follows that header's bottom while visible and settles at the top bar once scrolled past.
const SIDEBAR_TOP_VAR = '--mrx-sidebar-top';
const SIDEBAR_MIN_TOP = 56;
const SIDEBAR_TRACK_MAX_SCROLL = 1200;
let sidebarOffsetFrame = 0;

function computeSidebarTop() {
    if (window.scrollY > SIDEBAR_TRACK_MAX_SCROLL) return SIDEBAR_MIN_TOP;
    // Post routes can contain a tall subreddit header that isn't visible; never position the sidebar from it or the rail drops hundreds of pixels.
    const route = document.querySelector('shreddit-app')?.getAttribute('routename') || '';
    if (route === 'post_page' || route === 'profile_post_page') return SIDEBAR_MIN_TOP;
    const header = document.querySelector('.masthead, shreddit-subreddit-header');
    if (!header) return SIDEBAR_MIN_TOP;
    const rect = header.getBoundingClientRect();
    if (!rect.height) return SIDEBAR_MIN_TOP;
    return Math.min(Math.max(SIDEBAR_MIN_TOP, Math.round(rect.bottom)), Math.round(window.innerHeight * 0.6));
}

function applySidebarOffset(settings) {
    const root = document.documentElement;
    if (!root) return;
    if (!(settings.masterPower && settings.rightSidebarMoved)) {
        if (root.style.getPropertyValue(SIDEBAR_TOP_VAR)) root.style.removeProperty(SIDEBAR_TOP_VAR);
        return;
    }
    const value = computeSidebarTop() + 'px';
    if (root.style.getPropertyValue(SIDEBAR_TOP_VAR) !== value) root.style.setProperty(SIDEBAR_TOP_VAR, value);
}

function scheduleSidebarOffset() {
    if (sidebarOffsetFrame || !currentSettings.masterPower || !currentSettings.rightSidebarMoved) return;
    sidebarOffsetFrame = requestAnimationFrame(() => { sidebarOffsetFrame = 0; applySidebarOffset(currentSettings); });
}
