const FOLLOW_BTN_MARKER = 'data-mrx-hideFollowBtn';

function hideFollowButton(el) {
    if (!el || el.hasAttribute(FOLLOW_BTN_MARKER)) return;
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute(FOLLOW_BTN_MARKER, '1');
}

function restoreFollowButton(el) {
    if (!el || !el.hasAttribute(FOLLOW_BTN_MARKER)) return;
    el.style.removeProperty('display');
    el.removeAttribute(FOLLOW_BTN_MARKER);
}

function visitFollowButtons(scope, fn) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll(FOLLOW_BTN_SELECTOR).forEach(fn);
    if (scope !== document && !scope.isLightScope) return;
    scope.querySelectorAll('shreddit-post').forEach((post) => {
        if (post.shadowRoot) {
            try { post.shadowRoot.querySelectorAll(FOLLOW_BTN_SELECTOR).forEach(fn); } catch (e) { /* ignore */ }
        }
        post.querySelectorAll('shreddit-post-overflow-menu').forEach((menu) => {
            if (menu.shadowRoot) {
                try { menu.shadowRoot.querySelectorAll(FOLLOW_BTN_SELECTOR).forEach(fn); } catch (e) { /* ignore */ }
            }
        });
    });
}

function applyFollowButtonVisibility(root, settings) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    visitFollowButtons(root, restoreFollowButton);
    const shouldHide = settings.masterPower
        && settings.showPostOptions
        && settings.hideFollowPostButton;
    if (!shouldHide) return;
    visitFollowButtons(root, hideFollowButton);
}

const VOTE_MARKER = 'data-mrx-hideVoting';

function findVoteWrapper(el, partnerSelector, maxHops = 6) {
    let node = el;
    for (let i = 0; i < maxHops && node && node.parentElement; i++) {
        node = node.parentElement;
        if (node.querySelector && node.querySelector(partnerSelector) && isSafeToHide(node)) return node;
    }
    return el;
}
function applyVoteRule(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const shouldHide = settings.masterPower && settings.hideVoting;
    if (!shouldHide) {
        const restored = root.querySelectorAll(`[${VOTE_MARKER}]`);
        if (restored.length) restored.forEach((el) => { el.style.removeProperty('display'); el.removeAttribute(VOTE_MARKER); });
        return;
    }
    root.querySelectorAll(VOTE_UP_SELECTOR).forEach((upEl) => {
        if (upEl.closest(`[${VOTE_MARKER}]`)) return;
        const target = findVoteWrapper(upEl, VOTE_DOWN_SELECTOR);
        if (target.hasAttribute(VOTE_MARKER)) return;
        target.style.setProperty('display', 'none', 'important');
        target.setAttribute(VOTE_MARKER, '1');
    });
    root.querySelectorAll(VOTE_DOWN_SELECTOR).forEach((downEl) => {
        if (downEl.closest(`[${VOTE_MARKER}]`)) return;
        downEl.style.setProperty('display', 'none', 'important');
        downEl.setAttribute(VOTE_MARKER, '1');
    });
}

const COMMENT_BTN_MARKER = 'data-mrx-hideComments';

function applyCommentButtonRule(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const shouldHide = settings.masterPower && settings.hideComments;
    if (!shouldHide) {
        const restored = root.querySelectorAll(`[${COMMENT_BTN_MARKER}]`);
        if (restored.length) restored.forEach((el) => { el.style.removeProperty('display'); el.removeAttribute(COMMENT_BTN_MARKER); });
        return;
    }
    root.querySelectorAll(COMMENT_BTN_SELECTOR).forEach((el) => {
        if (el.closest(`[${COMMENT_BTN_MARKER}]`)) return;
        const text = ownText(el);
        if (text.includes('reply') || text.includes('replies')) return;
        if (el.closest('shreddit-comment') && !el.closest('shreddit-post')) return;
        if (!isSafeToHide(el)) return;
        let target = el;
        const btn = el.closest('button, a, [role="button"]');
        if (btn && isSafeToHide(btn)) target = btn;
        if (target.hasAttribute(COMMENT_BTN_MARKER)) return;
        target.style.setProperty('display', 'none', 'important');
        target.setAttribute(COMMENT_BTN_MARKER, '1');
    });
}

const FAVORITE_STAR_MARKER = 'data-mrx-hideFavoriteStar';

function applyFavoriteStarRule(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const shouldHide = settings.masterPower && settings.hideFavoriteStar;
    if (!shouldHide) {
        const restored = root.querySelectorAll(`[${FAVORITE_STAR_MARKER}]`);
        if (restored.length) restored.forEach((el) => { el.style.removeProperty('display'); el.removeAttribute(FAVORITE_STAR_MARKER); });
        return;
    }
    root.querySelectorAll(FAVORITE_STAR_SELECTOR).forEach((el) => {
        let target = el;
        const btn = el.closest('button, [role="button"]');
        if (btn && isSafeToHide(btn)) target = btn;
        if (target.hasAttribute(FAVORITE_STAR_MARKER)) return;
        target.style.setProperty('display', 'none', 'important');
        target.setAttribute(FAVORITE_STAR_MARKER, '1');
    });
}

const BACK_BTN_MARKER = 'data-mrx-hideBack';
const BACK_BTN_SELECTOR = '[icon-name*="arrow-left" i], [icon-name="back" i], [icon-name*="back-outline" i], [aria-label*="back" i], [data-post-click-location="back"], [slot="back-button"]';
const BACK_BTN_LABEL = /^(go\s+)?back(\s+to\b.*)?$/i;

function applyHidePostBackButton(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    if (!settings.masterPower || !settings.hidePostBackButton) {
        root.querySelectorAll(`[${BACK_BTN_MARKER}]`).forEach((el) => { el.style.removeProperty('display'); el.removeAttribute(BACK_BTN_MARKER); });
        return;
    }
    root.querySelectorAll(BACK_BTN_SELECTOR).forEach((hit) => {
        const el = hit.closest('button, a, [role="button"], faceplate-tracker') || hit;
        if (el.hasAttribute(BACK_BTN_MARKER)) return;
        const label = (el.getAttribute('aria-label') || hit.getAttribute('aria-label') || '').trim();
        const isBack = el.hasAttribute('slot') && /back/.test(el.getAttribute('slot')) ||
            el.getAttribute('data-post-click-location') === 'back' ||
            BACK_BTN_LABEL.test(label) ||
            (/arrow-left|back/i.test(hit.getAttribute('icon-name') || '') && !visibleLabelText(el));
        if (!isBack || !isInsidePost(el)) return;
        // Carousel arrows inside the media frame are not navigation buttons.
        if (el.closest('div[slot="post-media-container"], gallery-carousel, shreddit-gallery-carousel')) return;
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute(BACK_BTN_MARKER, '1');
    });
}
