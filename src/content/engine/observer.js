// Only added subtrees are swept. A full sweep runs once the page goes quiet to catch attribute changes.
const dirtyNodes = new Set();
const MAX_DIRTY_SCOPES = 150;
let overflowed = false;

function markDirty(mutations) {
    for (const m of mutations) {
        for (const node of m.addedNodes) {
            const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
            if (!el || el.id === 'mrx-css-doc' || el.id === 'mrx-css-shared') continue;
            if (el.hasAttribute && el.hasAttribute('data-mrx')) continue;
            if (dirtyNodes.size >= MAX_DIRTY_SCOPES) { overflowed = true; return; }
            dirtyNodes.add(el);
        }
    }
}

function collapseDirty() {
    const out = [];
    for (const el of dirtyNodes) {
        if (!el.isConnected) continue;
        let p = el.parentElement, covered = false;
        while (p) { if (dirtyNodes.has(p)) { covered = true; break; } p = p.parentElement; }
        if (!covered) out.push(el);
    }
    dirtyNodes.clear();
    return out;
}

const debouncedReprocess = debounce(() => {
    pruneDisconnectedRoots();
    if (overflowed) { overflowed = false; dirtyNodes.clear(); reprocessDocument(); return; }
    const scopes = collapseDirty();
    if (scopes.length) reprocessScopes(scopes);
}, 50, 200);

const settledFullSweep = (() => {
    let t = null;
    return () => {
        clearTimeout(t);
        t = setTimeout(() => { invalidateSurfaceChecks(); reprocessDocument(); }, 1500);
    };
})();

function startEngine() {
    processRoot(document);
    const rootObserver = new MutationObserver((mutations) => {
        scanMutationsForShadowRoots(mutations);
        queueVisualFromMutations(mutations);
        markDirty(mutations);
        debouncedReprocess();
        rediscoverAllRoots();
        settledFullSweep();
    });
    rootObserver.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('scroll', scheduleSidebarOffset, { passive: true });
    window.addEventListener('resize', scheduleSidebarOffset, { passive: true });
    document.addEventListener('keydown', handleArrowKeyNav, true);
    document.addEventListener('keydown', handleGalleryArrowKeyNav, true);
    document.addEventListener('keydown', handleVideoSeekArrowKeyNav, true);
    document.addEventListener('keydown', handleEnterKeyOpenPost, true);
    document.addEventListener('click', handleLightboxIntercept, true);
    setTimeout(rediscoverAndReapplyToKnownRoots, 500);
    setTimeout(rediscoverAndReapplyToKnownRoots, 2000);
    setTimeout(rediscoverAndReapplyToKnownRoots, 5000);
}
