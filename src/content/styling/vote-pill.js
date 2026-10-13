const VOTE_PILL_ATTR = 'data-mrx-vote-pill';

function findVotePillGroup(upEl) {
    let node = upEl;
    for (let i = 0; i < 4 && node.parentElement; i++) {
        node = node.parentElement;
        if (!node.querySelector(VOTE_PILL_DOWN)) continue;
        // Never widen the pill to the whole action bar.
        if (node.querySelector(VOTE_PILL_OTHER_ACTIONS)) return null;
        return node;
    }
    return null;
}

function neighbourPillBackground(group) {
    const bar = group.parentElement;
    if (!bar) return null;
    for (const sibling of bar.children) {
        if (sibling === group || sibling.contains(group)) continue;
        const candidates = [sibling, sibling.shadowRoot && sibling.shadowRoot.querySelector('button, a'), sibling.querySelector('button, a')];
        for (const c of candidates) {
            if (!c) continue;
            const bg = parseRgb(getComputedStyle(c).backgroundColor);
            if (bg && bg.a > 0.05) return getComputedStyle(c).backgroundColor;
        }
    }
    return null;
}

// True for a node inside a post (including nested shadow roots), false for comments.
function isInsidePost(node) {
    for (let n = node; n; ) {
        if (n.closest) {
            if (n.closest('shreddit-comment')) return false;
            if (n.closest('shreddit-post')) return true;
        }
        const r = n.getRootNode && n.getRootNode();
        n = r && r.host ? r.host : null;
    }
    return false;
}

// Up-vote button -> group already given the pill background; lets later passes skip it without a getComputedStyle.
const pillGroupByUp = new WeakMap();

function applyVotePillBackground(root, settings) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    if (!settings.masterPower) {
        root.querySelectorAll(`[${VOTE_PILL_ATTR}]`).forEach((el) => {
            el.style.removeProperty('background-color');
            el.style.removeProperty('border-radius');
            el.removeAttribute(VOTE_PILL_ATTR);
        });
        return;
    }
    root.querySelectorAll(VOTE_PILL_UP).forEach((upEl) => {
        const styled = pillGroupByUp.get(upEl);
        if (styled && styled.hasAttribute(VOTE_PILL_ATTR) && styled.contains(upEl)) return;
        if (!isInsidePost(upEl)) return;
        let group = findVotePillGroup(upEl);
        // A display:contents wrapper has no box of its own to paint.
        while (group && group.parentElement && getComputedStyle(group).display === 'contents') group = group.parentElement;
        if (!group) return;
        if (group.hasAttribute(VOTE_PILL_ATTR)) { pillGroupByUp.set(upEl, group); return; }
        if ((group.textContent || '').trim().length > 12) return;
        const fallback = prepareSurfaceTheme(settings)
            ? themeTokens(settings).elevated
            : 'var(--color-neutral-background-selected, rgba(128, 128, 128, 0.2))';
        group.style.setProperty('background-color', neighbourPillBackground(group) || fallback, 'important');
        group.style.setProperty('border-radius', 'var(--re-theme-border-radius, 9999px)', 'important');
        group.setAttribute(VOTE_PILL_ATTR, '1');
        pillGroupByUp.set(upEl, group);
    });
}

// A theme change invalidates pill colours; clear them so they are re-derived.
function resetVotePills(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll(`[${VOTE_PILL_ATTR}]`).forEach((el) => {
        el.style.removeProperty('background-color');
        el.removeAttribute(VOTE_PILL_ATTR);
    });
}
