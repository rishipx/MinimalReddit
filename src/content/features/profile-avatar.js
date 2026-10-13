// The avatar is found by shape, not markup: a roughly square 48-200px image near the top of a profile page,
// outside posts, comments and navigation. The outermost same-sized wrapper is scaled so rounded clips grow with it.

const PROFILE_AVATAR_MARKER = 'data-mrx-profile-avatar';
const PROFILE_AVATAR_SELECTOR = 'shreddit-avatar, faceplate-img, img, [data-testid*="avatar" i], .avatar, .profile-avatar';
const PROFILE_AVATAR_EXCLUDE = 'shreddit-post, shreddit-comment, article, reddit-sidebar-nav, shreddit-header, reddit-header-large, [role="dialog"], faceplate-hovercard';

function isProfilePage() {
    return /^\/(u|user)\/[^/]+\/?/i.test(location.pathname) && !/\/comments\//i.test(location.pathname);
}

function isInsideExcluded(el) {
    for (let n = el; n; ) {
        if (n.closest && n.closest(PROFILE_AVATAR_EXCLUDE)) return true;
        const r = n.getRootNode && n.getRootNode();
        n = r && r.host ? r.host : null;
    }
    return false;
}

function applyProfileAvatarScale(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const active = settings.masterPower && settings.scaleProfileAvatar > 1 && isProfilePage();
    if (!active) {
        root.querySelectorAll(`[${PROFILE_AVATAR_MARKER}]`).forEach((el) => el.removeAttribute(PROFILE_AVATAR_MARKER));
        return;
    }
    root.querySelectorAll(PROFILE_AVATAR_SELECTOR).forEach((el) => {
        if (el.hasAttribute(PROFILE_AVATAR_MARKER) || el.closest(`[${PROFILE_AVATAR_MARKER}]`)) return;
        const r = el.getBoundingClientRect();
        if (r.width < 48 || r.width > 200 || Math.abs(r.width - r.height) > 6 || r.top < -50 || r.top > 700) return;
        if (isInsideExcluded(el)) return;
        let target = el;
        for (let i = 0; i < 4 && target.parentElement; i++) {
            const pr = target.parentElement.getBoundingClientRect();
            if (Math.abs(pr.width - r.width) > 6 || Math.abs(pr.height - r.height) > 6) break;
            target = target.parentElement;
        }
        target.setAttribute(PROFILE_AVATAR_MARKER, '1');
    });
}
