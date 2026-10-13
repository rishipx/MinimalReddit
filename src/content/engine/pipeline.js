function reprocessShadowRoot(root) {
    const settings = currentSettings;
    applyAllCSS(settings, [root]);
    runDomRules(root, settings, true);
    queueVisual(root, true);
    repairRedditMedia(root);
}

// Rules that must apply in the frame content is inserted, so nothing flashes unstyled (see queueVisual).
function runVisualRules(root, settings) {
    applyShowPostOptions(root, settings);
    applyButtonLabelRule(root, settings);
    applyVotePillBackground(root, settings);
    applySurfaceRepair(root, settings);
}

function runDomRules(root, settings, skipVisual) {
    applyLabelRules(root, settings);
    applyVoteRule(root, settings);
    applyCommentButtonRule(root, settings);
    applyRightSidebarRule(root, settings);
    applyFavoriteStarRule(root, settings);
    applySectionRules(root, settings);
    applyRecentSections(root, settings);
    applyMulticolouredCommentLines(root, settings);
    applyHidePostBackButton(root, settings);
    applyProfileAvatarScale(root, settings);
    if (!skipVisual) runVisualRules(root, settings);
}

// Rules that only match light-DOM custom elements, so shadow roots never need them.
function runLightRules(root, settings) {
    applyAbsoluteTimestamps(root, settings);
    applyMediaDownloadButtons(root, settings);
    repairRedditMedia(root);
    applyVerificationButtons(root, settings);
    if (settings.arrowKeyNav) wakeGalleryAndVideoElements(root);
    applyFollowButtonVisibility(root, settings);
    if (window.MRXBlocker) window.MRXBlocker.scan(root, settings);
    if (window.MRXArchive) window.MRXArchive.attachButtons(root, settings);
    applyCollapseAutoMod(root, settings);
}

function runGlobalRules(settings) {
    updateClasses(settings);
    applyScrollToTop(settings.scrollToTop);
    applyCommunityFilter(document, settings);
    applyHideLogoInSearch(settings);
    applySidebarOffset(settings);
}

// querySelectorAll that also matches the scope itself, so a newly inserted <shreddit-post> takes the same path as a full sweep.
function scopeView(el) {
    return {
        isLightScope: true,
        node: el,
        querySelectorAll(sel) {
            const out = el.matches(sel) ? [el] : [];
            el.querySelectorAll(sel).forEach((n) => out.push(n));
            return out;
        }
    };
}

function reprocessDocument() {
    // Some components create their shadow root after insertion; a settled sweep catches them without polling.
    discoverShadowRoots(document);
    const settings = currentSettings;
    applyAllCSS(settings, [document]);
    runDomRules(document, settings);
    runLightRules(document, settings);
    runGlobalRules(settings);
}

function reprocessScopes(nodes) {
    const settings = currentSettings;
    for (const el of nodes) {
        discoverShadowRoots(el);
        const view = scopeView(el);
        runDomRules(view, settings);
        runLightRules(view, settings);
    }
    runGlobalRules(settings);
}

function reprocessRootLight(root) {
    if (root === document) reprocessDocument();
    else reprocessShadowRoot(root);
}

function processRoot(root) {
    reprocessRootLight(root);
    discoverShadowRoots(root);
}

// CSS and class settings reapply immediately. Recent-posts, button-label, vote-pill and theme-surface settings also get a DOM pass so no reload is needed.
function reapplyToKnownRoots() {
    pruneDisconnectedRoots(true);
    const settings = currentSettings;
    knownRoots.forEach((root) => {
        applyAllCSS(settings, [root]);
        // These use DOM markers, so toggling them needs a targeted reapply; this avoids rerunning the heavier declutter/blocker passes.
        applyRecentSections(root, settings);
        applySectionRules(root, settings);
        applyMulticolouredCommentLines(root, settings);
        applyHidePostBackButton(root, settings);
        applyProfileAvatarScale(root, settings);
        applyButtonLabelRule(root, settings);
        resetVotePills(root);
        applyVotePillBackground(root, settings);
        applySurfaceRepair(root, settings);
    });
    updateClasses(settings);
    applyScrollToTop(settings.scrollToTop);
    applyHideLogoInSearch(settings);
    applySidebarOffset(settings);
}

// Boot-time pass: reprocesses every root and rediscovers any shadow root that mounted before the observers attached.
function rediscoverAndReapplyToKnownRoots() {
    pruneDisconnectedRoots(true);
    knownRoots.forEach((root) => processRoot(root));
}
