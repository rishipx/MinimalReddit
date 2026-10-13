const observedRoots = new WeakSet();
const knownRoots = new Set([document]);

// Hosts seen without a shadow root yet. Shadow roots attach after insertion without a mutation, so these are polled cheaply.
const pendingHosts = new Set();

function noteShadowHost(el) {
    const sr = el.shadowRoot;
    if (sr) {
        pendingHosts.delete(el);
        if (!observedRoots.has(sr)) registerShadowRoot(sr);
    } else if (el.localName.indexOf('-') !== -1) {
        pendingHosts.add(el);
    }
}

function discoverShadowRoots(root) {
    if (typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('*').forEach(noteShadowHost);
}

// Late-attached shadow roots fire no mutation; a short debounced check of waiting hosts picks them up.
let rediscoveryTimer = null;
function checkPendingHosts() {
    for (const el of Array.from(pendingHosts)) {
        if (!el.isConnected) { pendingHosts.delete(el); continue; }
        if (el.shadowRoot) noteShadowHost(el);
    }
}
function rediscoverAllRoots() {
    if (rediscoveryTimer !== null) return;
    rediscoveryTimer = setTimeout(() => {
        rediscoveryTimer = null;
        pruneDisconnectedRoots();
        checkPendingHosts();
    }, 300);
}

// Per-root observers, kept so pruneDisconnectedRoots can disconnect them. WeakMap so a detached root isn't kept alive.
const shadowRootObservers = new WeakMap();

// Each shadow root needs its own observer; reprocessing is batched through one shared queue.
const pendingReprocessRoots = new Set();
const flushPendingReprocess = debounce(() => {
    pruneDisconnectedRoots();
    const roots = Array.from(pendingReprocessRoots);
    pendingReprocessRoots.clear();
    roots.forEach((root) => { if (knownRoots.has(root) && root.host && root.host.isConnected) reprocessRootLight(root); });
}, 50, 200);

function registerShadowRoot(sr) {
    if (observedRoots.has(sr)) return;
    observedRoots.add(sr);
    knownRoots.add(sr);
    reprocessRootLight(sr);

    // Reddit nests shadow components (e.g. the media player and its controller); discover descendants now so they get the theme bridge immediately.
    discoverShadowRoots(sr);

    const mo = new MutationObserver((mutations) => {
        scanMutationsForShadowRoots(mutations);
        queueVisualFromMutations(mutations, sr);
        pendingReprocessRoots.add(sr);
        flushPendingReprocess();
        rediscoverAllRoots();
    });
    // characterData catches late text such as award counts being filled in.
    mo.observe(sr, { childList: true, subtree: true, characterData: true });
    shadowRootObservers.set(sr, mo);
}

function scanMutationsForShadowRoots(mutations) {
    for (const m of mutations) {
        for (const node of m.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            noteShadowHost(node);
            // Childless nodes cannot contain shadow-hosting descendants.
            if (node.childElementCount === 0) continue;
            if (typeof node.querySelectorAll !== 'function') continue;
            node.querySelectorAll('*').forEach(noteShadowHost);
        }
    }
}

// Disconnect observers for roots whose host is gone. O(roots), so calls are rate-limited; a detached root only costs work until the next prune.
const PRUNE_MIN_INTERVAL_MS = 1000;
let lastPrune = 0;
function pruneDisconnectedRoots(force) {
    const now = Date.now();
    if (!force && now - lastPrune < PRUNE_MIN_INTERVAL_MS) return;
    lastPrune = now;
    for (const root of knownRoots) {
        if (root === document) continue;
        const host = root.host;
        if (!host || !host.isConnected) {
            knownRoots.delete(root);
            const mo = shadowRootObservers.get(root);
            if (mo) { mo.disconnect(); shadowRootObservers.delete(root); }
        }
    }
}
