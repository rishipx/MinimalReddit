import { browserAPI } from './browser-api.js';

import { persistSettings } from './settings-store.js';

export function initToggles() {
    // Which settings the popup binds to a checkbox/select by id. Values come from defaults.js.
    const POPUP_TOGGLE_KEYS = [
        'masterPower', 'hideAds', 'hideBlurredMediaBackground', 'hidePromotedLinks',
        'hideRedditPremium', 'hideRelatedCommunities', 'hideCommunityHighlights', 'hideLeftSidebar',
        'hideRightSidebar', 'hideSidebarRules', 'hideSidebarModerators', 'hideSidebarInstalledApps',
        'hideSidebarRelatedCommunities', 'hideStartCommunity', 'hidePopular', 'hideNews',
        'hideExplore', 'hideGamesLink', 'hideResources', 'hideFavoriteStar',
        'hideRecentSection', 'hideRecentPosts', 'hideCommunitiesSection', 'hideCreateFeed',
        'hideCustomFeedsSection', 'hideTopBar', 'nonStickyHeader', 'hideChat',
        'hideNotifications', 'hideCreate', 'hideAdvertiseButton', 'hideGetAppButton',
        'hideVoting', 'hideComments', 'hideShareOnPosts', 'hideShareOnComments',
        'hideRepostButton', 'hideJoinButtonOnPosts', 'hidePostBackButton', 'showPostOptions',
        'hidePostSaveOption', 'hidePostHideOption', 'hidePostReportOption', 'hidePostAwardOption',
        'hideFollowPostButton', 'hideFooter', 'rightSidebarMoved',
        'fullWidthBanner', 'dropShadows',
        'multicolouredCommentLines', 'hideInterfaceGaps', 'gradientBackground', 'blockPostsByKeyword',
        'blockPostsByUser', 'blockPostsBySubreddit', 'blockCommentsByKeyword', 'blockCommentsByUser',
        'scrollToTop', 'arrowKeyNav', 'communityFilterEnabled', 'collapseAutoMod',
        'hideButtonLabels', 'absoluteTimestampsPosts', 'absoluteTimestampsComments', 'showMediaDownloadButton',
        'showReverseImageSearchButton', 'discordStyleLightbox', 'showImageForensicsButton', 'showCropToolButton',
        'showCaliperButton', 'showVideoKeyframeButton', 'showArchiveContextButton', 'hideSearchbarLogo',
        'themeColours'
    ];
    const DEFAULTS = Object.fromEntries(POPUP_TOGGLE_KEYS.map((k) => [k, MRX_DEFAULTS[k]]));
    const keys = Object.keys(DEFAULTS);
    const elements = {};
    keys.forEach((k) => { elements[k] = document.getElementById(k); });

    function syncSectionTogglesFromTargets() {
        document.querySelectorAll('.section-toggle').forEach((st) => {
            const target = document.getElementById(st.dataset.target);
            if (target) st.checked = target.checked;
        });
    }

    browserAPI.storage.local.get(DEFAULTS, (settings) => {
        keys.forEach((k) => { if (elements[k]) elements[k].checked = !!settings[k]; });
        syncSectionTogglesFromTargets();
        syncPostOptionsChildren();
        syncDimmed();
    });

    keys.forEach((key) => {
        if (!elements[key]) return;
        elements[key].addEventListener('change', () => {
            persistSettings({ [key]: !!elements[key].checked });
            // Keep the section header toggle in sync when its target changes.
            document.querySelectorAll('.section-toggle').forEach((st) => {
                if (st.dataset.target === key) st.checked = elements[key].checked;
            });
        });
    });
    document.querySelectorAll('.section-toggle').forEach((sectionToggle) => {
        const target = document.getElementById(sectionToggle.dataset.target);
        if (!target) return;
        sectionToggle.addEventListener('change', () => {
            target.checked = sectionToggle.checked;
            target.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });
    const scrollbarWidthEl = document.getElementById('scrollbarWidth');
    if (scrollbarWidthEl) {
        browserAPI.storage.local.get({ scrollbarWidth: 'thin' }, ({ scrollbarWidth }) => {
            scrollbarWidthEl.value = scrollbarWidth || 'thin';
        });
        scrollbarWidthEl.addEventListener('change', () => {
            persistSettings({ scrollbarWidth: scrollbarWidthEl.value });
        });
    }
    const postOptionsToggle = document.getElementById('showPostOptions');
    const postOptionsChildren = document.getElementById('postOptionsChildren');
    function syncPostOptionsChildren() {
        if (!postOptionsToggle || !postOptionsChildren) return;
        postOptionsChildren.style.opacity = postOptionsToggle.checked ? '1' : '0.45';
        postOptionsChildren.style.pointerEvents = postOptionsToggle.checked ? 'auto' : 'none';
    }
    if (postOptionsToggle) {
        postOptionsToggle.addEventListener('change', syncPostOptionsChildren);
    }
    const dimTargets = Array.from(document.querySelectorAll('[data-dim-when]'));
    function syncDimmed() {
        dimTargets.forEach((el) => {
            const parent = document.getElementById(el.dataset.dimWhen);
            const on = !!(parent && parent.checked);
            el.classList.toggle('mrx-dimmed', on);
            el.inert = on;
            el.setAttribute('aria-disabled', on ? 'true' : 'false');
        });
    }
    new Set(dimTargets.map((el) => el.dataset.dimWhen)).forEach((id) => {
        const parent = document.getElementById(id);
        if (parent) parent.addEventListener('change', syncDimmed);
    });

    const TEXTAREA_KEYS = ['blockedPostKeywords', 'blockedPostUsers', 'blockedSubreddits', 'blockedCommentKeywords', 'blockedCommentUsers'];
    TEXTAREA_KEYS.forEach((key) => {
        const el = document.getElementById(key);
        if (!el) return;
        browserAPI.storage.local.get({ [key]: '' }, (obj) => { el.value = obj[key] || ''; });
        el.addEventListener('input', () => {
            persistSettings({ [key]: el.value });
        });
    });
}
