// Styled in a requestAnimationFrame callback, which runs before the frame paints. A follow-up pass catches late renders.
const visualQueue = new Map();   // element scopes (and the document, once the queue overflows)
const visualRoots = new Map();   // shadow roots: one entry each, never collapsed into a document pass
const rescanTargets = new Set();
const RESCAN_DELAY_MS = 400;
const MAX_VISUAL_SCOPES = 150;
let visualFrame = 0;
let rescanTimer = 0;

function isOwnNode(el) {
    return el.hasAttribute('data-mrx') || el.hasAttribute('data-mrx-hideButtonLabel') || el.id === 'mrx-scroll-top';
}

function queueVisual(target, isRescan = false) {
    const isRoot = target.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
    if (!isRoot && visualQueue.size >= MAX_VISUAL_SCOPES) target = document;
    const queue = isRoot ? visualRoots : visualQueue;
    if (!queue.has(target) || isRescan === false) queue.set(target, isRescan);
    if (!visualFrame) visualFrame = requestAnimationFrame(flushVisual);
}

function queueVisualFromMutations(mutations, shadowRoot) {
    for (const m of mutations) {
        // Text-only updates (timers, counters) are not new content, so they skip the late-render follow-up pass.
        if (m.type === 'characterData') { if (shadowRoot) queueVisual(shadowRoot, true); continue; }
        for (const node of m.addedNodes) {
            const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
            if (!el || isOwnNode(el)) continue;
            queueVisual(shadowRoot || el);
            if (shadowRoot) break;
        }
    }
}

function scheduleRescan(targets) {
    targets.forEach((t) => rescanTargets.add(t));
    if (rescanTimer) return;
    rescanTimer = setTimeout(() => {
        rescanTimer = 0;
        invalidateSurfaceChecks();
        const targets = Array.from(rescanTargets);
        rescanTargets.clear();
        targets.forEach((t) => queueVisual(t, true));
    }, RESCAN_DELAY_MS);
}

function flushVisual() {
    visualFrame = 0;
    const settings = currentSettings;
    const batch = Array.from(visualQueue).concat(Array.from(visualRoots));
    visualQueue.clear();
    visualRoots.clear();
    const fresh = [];
    for (const [target, isRescan] of batch) {
        if (target === document) runVisualRules(document, settings);
        else if (target.nodeType === Node.ELEMENT_NODE) {
            if (!target.isConnected) continue;
            runVisualRules(scopeView(target), settings);
        } else if (knownRoots.has(target)) runVisualRules(target, settings);
        else continue;
        if (!isRescan) fresh.push(target);
    }
    if (fresh.length) scheduleRescan(fresh);
}
