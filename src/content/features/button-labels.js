const BUTTON_LABEL_MARKER = 'data-mrx-hideButtonLabel';
const BUTTON_LABEL_HIDDEN = 'data-mrx-button-label-hidden';
const ACTION_BUTTON_LABELS = new Set([
    'reply', 'replies', 'comment', 'comments', 'share', 'repost', 'save',
    'hide', 'report', 'award', 'award this post', 'follow', 'follow post',
    'join', 'subscribe', 'unfollow', 'unjoin', 'unsave', 'remove', 'more',
    'edit', 'delete'
]);

function actionLabelText(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    const text = normalizeText(el.textContent || '');
    return text && text.length <= 32 ? text : '';
}

function isVisualIconElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName.toLowerCase();
    return /^(svg|img|icon|faceplate-icon|faceplate-tracker)$/.test(tag) ||
        el.hasAttribute('icon-name') || el.hasAttribute('data-icon');
}

function closestClickable(el) {
    let n = el && el.nodeType === Node.ELEMENT_NODE ? el : el?.parentElement;
    for (let i = 0; n && i < 10; i++, n = n.parentElement) {
        if (/^(BUTTON|A)$/.test(n.tagName) || n.getAttribute('role') === 'button' ||
            n.matches?.(`award-button, shreddit-post-save-button, shreddit-post-share-button, shreddit-post-repost-button, .${POST_OPTION_CLASS}`)) return n;
    }
    return null;
}

// Geometry lives in shared-css.js and keys off these attributes. Text-less buttons are "icon-only" (fixed, centred);
// award buttons that still show a count are "award-compact" and grow to fit it.
const AWARD_COMPACT = 'data-mrx-award-compact';
const AWARD_ICON_HIDDEN = 'data-mrx-award-icon-hidden';
const HEADER_CREATE = 'data-mrx-header-create';

// Visible text under root, including open shadow trees, excluding labels this feature already hid.
function visibleLabelText(root) {
    let text = '';
    const stack = [root];
    while (stack.length) {
        const n = stack.pop();
        if (n.nodeType === Node.TEXT_NODE) { text += n.nodeValue; continue; }
        if (n.nodeType !== Node.ELEMENT_NODE && n.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) continue;
        if (n.nodeType === Node.ELEMENT_NODE) {
            if (n.hasAttribute(BUTTON_LABEL_MARKER) || /^(STYLE|SCRIPT|TEMPLATE)$/.test(n.tagName)) continue;
            if (n.shadowRoot) stack.push(n.shadowRoot);
        }
        for (const child of n.childNodes) stack.push(child);
    }
    return text.trim();
}

// A custom element that has not rendered yet looks icon-only but is not.
function isAwaitingRender(el) {
    return el.tagName.includes('-') && !el.shadowRoot && el.childElementCount === 0;
}

function centerIconOnlyButton(button) {
    if (!button || button.nodeType !== Node.ELEMENT_NODE) return;
    // Buttons inside the media frame (the extension's own overlay tools, gallery arrows) keep their fixed size.
    if (button.closest('div[slot="post-media-container"]')) { button.removeAttribute(BUTTON_LABEL_HIDDEN); return; }
    // A host whose shadow tree holds its own button: size that inner pill, not the host, or min-width and padding stack.
    if (button.shadowRoot && button.tagName.includes('-') && button.shadowRoot.querySelector('button, a, [role="button"]')) {
        button.removeAttribute(BUTTON_LABEL_HIDDEN);
        button.removeAttribute(AWARD_COMPACT);
        return;
    }
    const hasText = visibleLabelText(button).length > 0;
    if (!hasText && isAwaitingRender(button)) return;
    const isAward = button.matches(AWARD_SELECTOR) || !!button.closest(AWARD_SELECTOR) || /\bawards?\b/i.test(button.textContent || '');
    if (!hasText) {
        button.removeAttribute(AWARD_COMPACT);
        button.setAttribute(BUTTON_LABEL_HIDDEN, '1');
    } else if (isAward) {
        button.removeAttribute(BUTTON_LABEL_HIDDEN);
        button.setAttribute(AWARD_COMPACT, '1');
        // With awards present, show only the award artwork and count, not the generic award glyph.
        const hasArtwork = !!button.querySelector('img, faceplate-img, picture');
        button.querySelectorAll('svg, faceplate-icon, [icon-name]').forEach((icon) => {
            if (hasArtwork) icon.setAttribute(AWARD_ICON_HIDDEN, '1');
            else icon.removeAttribute(AWARD_ICON_HIDDEN);
        });
    } else {
        button.removeAttribute(BUTTON_LABEL_HIDDEN);
        button.removeAttribute(AWARD_COMPACT);
    }
}

function markLabelNode(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || isVisualIconElement(el)) return;
    if (el.hasAttribute(BUTTON_LABEL_MARKER)) return;
    el.setAttribute(BUTTON_LABEL_MARKER, '1');
    el.style.setProperty('display', 'none', 'important');
    const button = closestClickable(el);
    if (button) centerIconOnlyButton(button);
}

function hideExactTextNodes(container, allowedLabels, predicate) {
    // Scope views (see engine/pipeline.js) wrap a real element; unwrap before walking.
    const target = container && container.isLightScope ? container.node : container;
    if (!target || !(target instanceof Node)) return;
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
        if (!node.nodeValue || !node.nodeValue.trim()) continue;
        const parent = node.parentElement;
        if (!parent || /^(SCRIPT|STYLE|TEMPLATE)$/.test(parent.tagName)) continue;
        if (parent.hasAttribute(BUTTON_LABEL_MARKER) || parent.closest?.(`[${BUTTON_LABEL_MARKER}]`)) continue;
        if (isVisualIconElement(parent) || parent.closest?.('svg, symbol, foreignObject')) continue;
        const text = normalizeText(node.nodeValue);
        if (!allowedLabels.has(text)) continue;
        if (!predicate(parent, text)) continue;
        nodes.push(node);
    }
    nodes.forEach((textNode) => {
        const span = document.createElement('span');
        span.setAttribute(BUTTON_LABEL_MARKER, '1');
        span.style.setProperty('display', 'none', 'important');
        textNode.parentNode.insertBefore(span, textNode);
        span.appendChild(textNode);
        const button = closestClickable(span);
        if (button) centerIconOnlyButton(button);
    });
}

function hideButtonLabelChildren(button, allowedLabels) {
    if (!button || button.nodeType !== Node.ELEMENT_NODE) return;

    button.querySelectorAll('span, p, div, label, slot').forEach((el) => {
        if (el.tagName === 'SLOT' || isVisualIconElement(el)) return;
        if (el.children?.length) return;
        if (allowedLabels.has(actionLabelText(el))) markLabelNode(el);
    });

    // Bare text labels: Award/Follow variants where the wording is a direct or slotted text node.
    hideExactTextNodes(button, allowedLabels, (parent) => {
        const clickable = closestClickable(parent);
        return !!clickable && (clickable === button || button.contains(clickable));
    });

    // Re-evaluate geometry every pass: award counts can appear after the label.
    if (button.hasAttribute(BUTTON_LABEL_HIDDEN) || button.hasAttribute(AWARD_COMPACT) ||
        !visibleLabelText(button) || button.matches(AWARD_SELECTOR)) {
        centerIconOnlyButton(button);
    }
}

function isCreateControl(el) {
    const clickable = closestClickable(el);
    if (!clickable) return false;
    const aria = normalizeText(clickable.getAttribute('aria-label') || '');
    const title = normalizeText(clickable.getAttribute('title') || '');
    const href = clickable.getAttribute('href') || '';
    return aria === 'create' || aria === 'create post' || title === 'create' ||
        /\/submit(?:\/|$|\?)/i.test(href) || clickable.matches?.('[data-testid="create-post"], [data-testid*="create" i]');
}

// The header Create control is tagged so it can be squared off like its neighbours.
function markHeaderCreate(clickable) {
    const host = clickable.getRootNode().host;
    if (!clickable.closest(HEADER_CREATE_HOST_SELECTOR) && !(host && host.matches(HEADER_CREATE_HOST_SELECTOR))) return;
    clickable.removeAttribute(BUTTON_LABEL_HIDDEN);
    clickable.setAttribute(HEADER_CREATE, '1');
}

function applyButtonLabelRule(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const marker = `[${BUTTON_LABEL_MARKER}]`;
    const hiddenButtonSelector = `[${BUTTON_LABEL_HIDDEN}]`;

    if (!settings.masterPower || !settings.hideButtonLabels) {
        root.querySelectorAll(marker).forEach((el) => {
            el.style.removeProperty('display');
            el.removeAttribute(BUTTON_LABEL_MARKER);
        });
        root.querySelectorAll(`${hiddenButtonSelector}, [${AWARD_COMPACT}], [${HEADER_CREATE}]`).forEach((el) => {
            el.removeAttribute(BUTTON_LABEL_HIDDEN);
            el.removeAttribute(AWARD_COMPACT);
            el.removeAttribute(HEADER_CREATE);
        });
        return;
    }

    // Pass 1: known action hosts. Selectors stay narrow so navigation text is never stripped.
    root.querySelectorAll(ACTION_BUTTON_HOST_SELECTOR).forEach((host) => {
        const targets = /^(SHREDDIT-|AWARD-BUTTON)/.test(host.tagName)
            ? Array.from(host.shadowRoot?.querySelectorAll?.('button, a, [role="button"]') || []).concat([host])
            : [host];
        targets.forEach((button) => hideButtonLabelChildren(button, ACTION_BUTTON_LABELS));
    });

    // Pass 2: exact label text inside a known action host (nested Faceplate components, slot distribution).
    root.querySelectorAll(ACTION_BUTTON_HOST_SELECTOR).forEach((host) => {
        hideExactTextNodes(host, ACTION_BUTTON_LABELS, (parent) => !!closestClickable(parent));
    });

    // Pass 3: Create. Reddit has shipped it as a button, anchor, slotted text and nested component;
    // match all of them without touching other uses of the word.
    root.querySelectorAll('button, a, [role="button"], faceplate-tracker, faceplate-part').forEach((el) => {
        if (!isCreateControl(el) && normalizeText(el.textContent || '') !== 'create') return;
        const clickable = closestClickable(el);
        if (!clickable || !isCreateControl(el)) return;
        hideButtonLabelChildren(clickable, new Set(['create']));
        markHeaderCreate(clickable);
    });
    hideExactTextNodes(root, new Set(['create']), (parent) => isCreateControl(parent));

    // Pass 4: in header shadow roots Create can sit in a non-clickable custom element; walk to the
    // nearest clickable ancestor and confirm it is inside a header host.
    root.querySelectorAll(HEADER_CREATE_HOST_SELECTOR).forEach((header) => {
        hideExactTextNodes(header, new Set(['create']), (parent) => {
            const clickable = closestClickable(parent);
            if (!clickable || !isCreateControl(parent)) return false;
            markHeaderCreate(clickable);
            return true;
        });
    });
}
