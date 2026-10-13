import { browserAPI } from './browser-api.js';

function withActiveRedditTab(callback) {
    browserAPI.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes("reddit.com")) callback(tabs[0]);
    });
}

// Settings the content script applies instantly (stylesheet or class changes). Anything else is applied by
// walking the DOM and may need a page reload to affect already-rendered content.
const INSTANT_APPLY_KEYS = new Set([
    'activeThemeCSS', 'activeThemePreset', 'arrowKeyNav', 'bgBlur', 'bgColor', 'bgImageData',
    'borderRadius', 'commentWeight', 'contentWidth', 'contentWidthMode',
    'customFontData', 'customFontName', 'discordStyleLightbox',
    'dropShadows', 'fontSelection', 'fullWidthBanner', 'gradientBackground', 'gradientFrom',
    'gradientTo', 'hideAds', 'hideAdvertiseButton', 'hideBlurredMediaBackground', 'hideButtonLabels',
    'hideChat', 'hideCommunitiesSection', 'hideCreate', 'hideCustomFeedsSection', 'hideFooter',
    'hideGamesLink', 'hideGetAppButton', 'hideInterfaceGaps', 'hideJoinButtonOnPosts',
    'hideLeftSidebar', 'hideNotifications', 'hidePostBackButton', 'hidePromotedLinks',
    'hideRedditPremium', 'hideRecentSection', 'hideRecentPosts', 'hideRepostButton', 'hideResources', 'hideSearchbarLogo',
    'hideShareOnComments', 'hideShareOnPosts', 'hideTopBar', 'masterPower', 'nonStickyHeader',
    'postContentWeight', 'postWidth', 'resizeComments', 'resizePostContent', 'rightSidebarMoved',
    'scaleProfileAvatar', 'scrollToTop', 'scrollbarWidth', 'sideMenuWidth', 'themeBackgroundColor',
    'themeColours', 'themeEnabled', 'themePrimaryColor', 'themeSecondaryColor',
    'absoluteTimestampFormat', 'hideRelatedCommunities', 'multicolouredCommentLines',
    // Popup-only bookkeeping key does not require a page reload.
    'hasBgImage'
]);

function maybeShowReloadBanner(changedKeys) {
    const reloadBanner = document.getElementById('mrxReloadBanner');
    if (!reloadBanner) return;
    const needsReload = changedKeys.some((k) => !INSTANT_APPLY_KEYS.has(k));
    if (needsReload) reloadBanner.classList.add('visible');
}
// Storage change events are the single settings propagation path.
export function persistSettings(obj) {
    browserAPI.storage.local.set(obj);
    maybeShowReloadBanner(Object.keys(obj));
}

export function initReloadBanner() {
    const reloadBanner = document.getElementById('mrxReloadBanner');
    const reloadBannerBtn = document.getElementById('mrxReloadBannerBtn');
    if (reloadBannerBtn) {
        reloadBannerBtn.addEventListener('click', () => {
            withActiveRedditTab((tab) => browserAPI.tabs.reload(tab.id));
            reloadBanner.classList.remove('visible');
        });
    }
}
