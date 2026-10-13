const browserAPI = typeof chrome !== 'undefined' && chrome.runtime ? chrome : browser;

const DEFAULT_SETTINGS = Object.assign({}, MRX_DEFAULTS);

// Live settings for this tab; kept current by the storage listener in main.js.
let currentSettings = { ...DEFAULT_SETTINGS };

// Large blobs (fonts, backgrounds) are read from storage only when their feature is active.
const LAZY_KEYS = ['bgImageData', 'customFontData'];
const EAGER_DEFAULTS = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).filter(([k]) => !LAZY_KEYS.includes(k)));
function wantsLazy(s, key) {
    if (!s.masterPower) return false;
    if (key === 'customFontData') return s.fontSelection === 'custom' && !!s.customFontName;
    if (key === 'bgImageData') return !!s.hasBgImage && !s.gradientBackground;
    return false;
}
function syncLazy(done) {
    const s = currentSettings;
    const missing = [];
    for (const k of LAZY_KEYS) {
        if (wantsLazy(s, k)) { if (!s[k]) missing.push(k); }
        else if (s[k]) s[k] = '';
    }
    if (!missing.length) { if (done) done(); return; }
    browserAPI.storage.local.get(missing, (res) => {
        Object.assign(currentSettings, res || {});
        if (done) done();
    });
}
