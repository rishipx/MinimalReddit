const DOC_CSS_ID = 'mrx-css-doc';
const SHARED_CSS_ID = 'mrx-css-shared';

const CSS_AFFECTING_KEYS = [
    'masterPower', 'hideFooter', 'hideResources', 'hideCommunitiesSection',
    'hideCustomFeedsSection', 'hideGamesLink', 'hideShareOnPosts', 'hideShareOnComments',
    'hideRepostButton', 'hideGetAppButton', 'hidePromotedLinks',
    'hideRedditPremium', 'hideJoinButtonOnPosts', 'hidePostBackButton',
    'hideCommunityHighlights', 'hideRelatedCommunities', 'nonStickyHeader', 'hideTopBar',
    'fontSelection', 'customFontName', 'customFontData',
    'themeColours', 'themePrimaryColor', 'themeSecondaryColor', 'themeBackgroundColor',
    'gradientBackground', 'gradientFrom', 'gradientTo', 'bgImageData', 'bgColor', 'bgBlur',
    'themeEnabled', 'activeThemePreset', 'activeThemeCSS',
    'resizePostContent', 'resizeComments', 'postContentWeight', 'commentWeight',
    'scrollbarWidth',
    'contentWidthMode', 'contentWidth', 'postWidth', 'sideMenuWidth',
    'borderRadius', 'rightSidebarMoved',
    'dropShadows', 'multicolouredCommentLines', 'hideInterfaceGaps',
    'scaleProfileAvatar', 'fullWidthBanner', 'showPostOptions', 'hideSearchbarLogo', 'hideButtonLabels'
];

let _cssFingerprint = null;
let _cssDoc = '';
let _cssShared = '';

function computeFingerprint(s) {
    let fp = '';
    for (const k of CSS_AFFECTING_KEYS) fp += k + '\u0001' + String(s[k]) + '\u0002';
    return fp;
}
function getBuiltCSS(s) {
    const fp = computeFingerprint(s);
    if (fp === _cssFingerprint) return { doc: _cssDoc, shared: _cssShared };
    _cssFingerprint = fp;
    _cssDoc = buildDocCSS(s);
    _cssShared = buildSharedCSS(s);
    return { doc: _cssDoc, shared: _cssShared };
}
function injectCSS(id, css, root) {
    const isDoc = root === document;
    const container = isDoc ? (document.head || document.documentElement) : root;
    if (!container || typeof container.querySelector !== 'function') return;
    let el = container.querySelector(`:scope > style#${id}`);
    if (!css) { if (el) el.remove(); return; }
    if (!el) {
        el = document.createElement('style');
        el.id = id;
        el.setAttribute('data-mrx', '1');
        container.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
}

// One constructable stylesheet shared by all shadow roots; per-root <style> fallback where adoption isn't allowed (Firefox content-script sandbox).
let sharedSheet = null, sharedSheetCss = null, adoptSupported = null;
const adoptedShadowRoots = new WeakSet();
function detectAdoptSupport() {
    try { return typeof CSSStyleSheet === 'function' && 'replaceSync' in CSSStyleSheet.prototype && 'adoptedStyleSheets' in ShadowRoot.prototype; }
    catch (e) { return false; }
}
function applySharedToShadow(root, css) {
    if (adoptSupported === null) adoptSupported = detectAdoptSupport();
    if (adoptSupported) {
        try {
            if (!sharedSheet) sharedSheet = new CSSStyleSheet();
            if (sharedSheetCss !== css) { sharedSheet.replaceSync(css || ''); sharedSheetCss = css; }
            // Fast path: already adopted and up to date (the sheet itself is shared, so nothing to redo).
            if (css && adoptedShadowRoots.has(root) && root.adoptedStyleSheets.includes(sharedSheet)) return;
            const cur = Array.from(root.adoptedStyleSheets);
            const has = cur.includes(sharedSheet);
            if (!css) {
                adoptedShadowRoots.delete(root);
                if (has) root.adoptedStyleSheets = cur.filter((x) => x !== sharedSheet);
                injectCSS(SHARED_CSS_ID, '', root);
                return;
            }
            if (!has) root.adoptedStyleSheets = [...cur, sharedSheet];
            if (Array.from(root.adoptedStyleSheets).includes(sharedSheet)) { adoptedShadowRoots.add(root); injectCSS(SHARED_CSS_ID, '', root); return; }
            adoptSupported = false;
        } catch (e) { adoptSupported = false; }
    }
    injectCSS(SHARED_CSS_ID, css, root);
}

// First-paint cache: storage is async, so the last CSS is mirrored to sessionStorage and injected synchronously at
// document_start. sessionStorage is page-readable, so entries must have the expected shape and no @import or markup.
const CSS_CACHE_KEY = `mrx:css-cache:v2:${browserAPI.runtime.id}`;
const CSS_CACHE_MAX_CHARS = 150000;
const CSS_CACHE_FORBIDDEN = /@import|<\/?[a-z!]/i;
function isCacheableCSS(css) {
    return typeof css === 'string' && css.length <= CSS_CACHE_MAX_CHARS && !CSS_CACHE_FORBIDDEN.test(css);
}
function primeCachedCSS() {
    try {
        const raw = window.sessionStorage.getItem(CSS_CACHE_KEY);
        if (!raw) return;
        const cached = JSON.parse(raw);
        if (!cached || !isCacheableCSS(cached.doc) || !isCacheableCSS(cached.shared)) {
            window.sessionStorage.removeItem(CSS_CACHE_KEY);
            return;
        }
        injectCSS(DOC_CSS_ID, cached.doc, document);
        injectCSS(SHARED_CSS_ID, cached.shared, document);
    } catch (e) { /* storage blocked or corrupt: nothing to prime */ }
}
function saveCSSCache(settings) {
    try {
        const { doc, shared } = getBuiltCSS(settings);
        // Empty output (extension off) and oversized output (e.g. an embedded background
        // image) are not cached.
        if ((!doc && !shared) || !isCacheableCSS(doc) || !isCacheableCSS(shared)) {
            window.sessionStorage.removeItem(CSS_CACHE_KEY);
            return;
        }
        window.sessionStorage.setItem(CSS_CACHE_KEY, JSON.stringify({ doc, shared }));
    } catch (e) { /* ignore */ }
}

function applyAllCSS(settings, roots) {
    const { doc, shared } = getBuiltCSS(settings);
    const targets = roots || knownRoots;
    targets.forEach((root) => {
        if (root === document) {
            injectCSS(DOC_CSS_ID, doc, document);
            injectCSS(SHARED_CSS_ID, shared, document);
            syncThemeRuntimeVariables(settings);
        } else {
            applySharedToShadow(root, shared);
        }
    });
}
