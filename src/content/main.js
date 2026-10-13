primeCachedCSS();
browserAPI.storage.local.get(EAGER_DEFAULTS, (loaded) => {
    currentSettings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    if (!currentSettings.fontSelection) currentSettings.fontSelection = 'inter';
    const boot = () => {
        applyResizeVars(currentSettings);
        startEngine();
        syncLazy(() => { reapplyToKnownRoots(); saveCSSCache(currentSettings); });
    };
    if (document.documentElement) boot();
    else document.addEventListener('DOMContentLoaded', boot);
});

// Runtime messages are reserved for actions that are not storage-backed.
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;
    if (message.action === 'mrxDebugInfo') {
        try { sendResponse({ ok: true, info: collectDebugInfo() }); }
        catch (e) { sendResponse({ ok: false, error: String((e && e.message) || e) }); }
    } else if (message.action === 'mrxCopyToClipboard') {
        try { navigator.clipboard.writeText(message.text); } catch (e) { /* ignore */ }
    } else if (message.action === 'mrxAnalyzeImageContext') {
        openELAPanel(message.url);
    } else if (message.action === 'mrxDownloadMediaContext') {
        const ext = guessMediaExtension(message.url, 'jpg');
        downloadMedia(message.url, `reddit-media.${ext}`);
    }
});

browserAPI.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let changed = false;
    const updated = Object.assign({}, currentSettings);
    Object.keys(changes).forEach((key) => {
        updated[key] = changes[key].newValue;
        changed = true;
    });
    if (changed) {
        currentSettings = updated;
        applyResizeVars(currentSettings);
        if (!currentSettings.discordStyleLightbox) closeCustomLightbox();
        syncLazy(() => { reapplyToKnownRoots(); saveCSSCache(currentSettings); });
    }
});
