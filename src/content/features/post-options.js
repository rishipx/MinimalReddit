const POST_OPTION_CLASS = 'mrx-post-option';

const POST_OPTIONS_CLASS = 'mrx-post-options-attached';

function applyShowPostOptions(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    if (!settings.masterPower || !settings.showPostOptions) return;

    // Sub-toggles are reversed (ON = hidden): an action moves to the action bar only when its "hide" toggle is OFF.
    const actions = [];
    if (!settings.hidePostSaveOption) actions.push('save');
    if (!settings.hidePostHideOption) actions.push('hide');
    if (!settings.hidePostReportOption) actions.push('report');
    if (!settings.hidePostAwardOption) actions.push('award');

    root.querySelectorAll('shreddit-post:not(.' + POST_OPTIONS_CLASS + ')').forEach((post) => {
        const overflowMenuButton = post.querySelector('shreddit-post-overflow-menu');
        if (!overflowMenuButton) return;
        const overflowMenuContainer = overflowMenuButton.closest('span');
        const shadow = overflowMenuButton.shadowRoot;
        if (!shadow) return;
        const overflowMenu = shadow.querySelector('faceplate-dropdown-menu, faceplate-bottom-sheet, faceplate-menu');
        if (!overflowMenu) return;
        const shareSlot = post.shadowRoot && post.shadowRoot.querySelector('slot[name="share-button"]');
        if (!shareSlot) return;
        const actionBar = shareSlot.parentElement;
        if (!actionBar) return;
        actionBar.classList.add('mrx-action-bar');
        actionBar.style.flexWrap = 'wrap';
        actionBar.style.height = 'fit-content';

        const followButton = overflowMenu.querySelector('#post-overflow-follow') || overflowMenu.querySelector('#post-overflow-replyNotifs');
        // Only move the follow button if the user hasn't opted to hide it.
        if (followButton && overflowMenuContainer && !settings.hideFollowPostButton) {
            const inner = followButton.querySelector(':scope > div');
            if (inner) {
                inner.removeAttribute('style');
                inner.classList.remove('gap-xs');
                inner.style.padding = '0';
                inner.style.borderRadius = 'var(--re-theme-border-radius, 9999px)';
            }
            const label = followButton.querySelector('span:has(>.text-body-2)');
            if (label) label.style.display = 'none';
            followButton.classList.add(POST_OPTION_CLASS);
            overflowMenuContainer.appendChild(followButton);
        }

        actions.forEach((action) => {
            const el = overflowMenu.querySelector(`#post-overflow-${action}`);
            if (!el) return;
            el.className = `button button-secondary ${POST_OPTION_CLASS}`;
            el.style.borderRadius = 'var(--re-theme-border-radius, 9999px)';
            el.querySelectorAll(':scope div.py-2xs').forEach((d) => d.classList.remove('py-2xs'));
            el.querySelectorAll(':scope div').forEach((d) => { d.style.color = 'var(--re-theme-post-text-2, inherit)'; d.style.padding = '0'; });
            el.querySelectorAll(':scope div > span').forEach((s) => s.classList.remove('gap-xs'));
            actionBar.insertBefore(el, shareSlot);
        });

        post.classList.add(POST_OPTIONS_CLASS);
        if (!overflowMenu.querySelector('li')) overflowMenuButton.style.display = 'none';
    });
}
