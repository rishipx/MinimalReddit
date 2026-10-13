// Reddit hard-codes dark backgrounds on some containers that the token bridge can't reach.
// Under a dark theme they are found from their computed colour and made transparent.

const SURFACE_FIX_ATTR = 'data-mrx-surface-fix';
const SURFACE_SKIP_TAGS = /^(IMG|VIDEO|CANVAS|SVG|PICTURE|IFRAME|INPUT|TEXTAREA|SELECT|OPTION|STYLE|SCRIPT|SLOT|PATH|SOURCE|TRACK)$/;
const SURFACE_CHUNK = 600;
const COLOR_TOLERANCE = 6;

let surfaceThemeKey = null;
let surfaceFloorLuminance = 0;
let surfaceTokenColors = [];
const surfaceSeen = new WeakMap();
let surfaceEpoch = 0;
const surfacePendingRoots = new WeakSet();
let colorProbe = null;

function normaliseColor(value) {
    try {
        if (!colorProbe) colorProbe = document.createElement('canvas').getContext('2d');
        colorProbe.fillStyle = '#000';
        colorProbe.fillStyle = value;
        return parseRgb(colorProbe.fillStyle) || parseHex(colorProbe.fillStyle);
    } catch (e) { return null; }
}

function parseHex(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
}

function parseRgb(value) {
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(value || '');
    if (!m) return null;
    let a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (m[4] && m[4].endsWith('%')) a /= 100;
    return { r: +m[1], g: +m[2], b: +m[3], a };
}

function luminance({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function isThemeToken(c) {
    return surfaceTokenColors.some((t) => Math.abs(t.r - c.r) <= COLOR_TOLERANCE && Math.abs(t.g - c.g) <= COLOR_TOLERANCE && Math.abs(t.b - c.b) <= COLOR_TOLERANCE);
}

// Returns true when the surface repair is active, refreshing cached theme data.
function prepareSurfaceTheme(settings) {
    const preset = settings.masterPower ? getActiveThemeDefinition(settings) : null;
    if (!preset || preset.mode === 'light') { surfaceThemeKey = null; return false; }
    const t = themeTokens(settings);
    const key = [t.page, t.surface, t.elevated, t.input].join('|');
    if (key !== surfaceThemeKey) {
        surfaceThemeKey = key;
        // A theme switch changes the palette and darkness cutoff; revisit elements judged under the old theme.
        surfaceEpoch++;
        surfaceTokenColors = [t.page, t.surface, t.elevated, t.input].map(normaliseColor).filter(Boolean);
        // The darkest token as cutoff misses Reddit's fixed #111-ish gutters in near-black presets (Zen/OLED). Theme colours stay
        // exempt via isThemeToken(); other surfaces are compared to a fraction of the comment surface.
        const pageColor = normaliseColor(t.page);
        const surfaceColor = normaliseColor(t.surface);
        const pageLuminance = pageColor ? luminance(pageColor) : 0;
        const surfaceLuminance = surfaceColor ? luminance(surfaceColor) : 0;
        surfaceFloorLuminance = Math.max(pageLuminance, surfaceLuminance * 0.65);
    }
    return true;
}

// Elements judged before Reddit's own styles were applied must be looked at again.
function invalidateSurfaceChecks() { surfaceEpoch++; }

function isCircularOrPill(el, rect) {
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return radius >= Math.min(rect.width, rect.height) * 0.4;
}

function applySurfaceRepair(root, settings) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    if (!prepareSurfaceTheme(settings)) {
        const stale = root.querySelectorAll(`[${SURFACE_FIX_ATTR}]`);
        if (stale.length) stale.forEach((el) => el.removeAttribute(SURFACE_FIX_ATTR));
        return;
    }
    if (root.host && SURFACE_SKIP_HOSTS.test(root.host.tagName)) return;

    const pending = [];
    const now = Date.now();
    root.querySelectorAll('*').forEach((el) => {
        if (SURFACE_SKIP_TAGS.test(el.tagName)) return;
        if (surfaceSeen.get(el) === `${surfaceEpoch}|${el.getAttribute('class')}`) return;
        pending.push(el);
    });
    if (!pending.length) return;

    const batch = pending.slice(0, SURFACE_CHUNK);
    // A marked element is transparent, so it would read as not dark, get unmarked, then re-marked next pass (flicker).
    // Lift the marks first so elements are judged by Reddit's real colour, then restore them in the same frame.
    const wasMarked = new Set(batch.filter((el) => el.hasAttribute(SURFACE_FIX_ATTR)));
    wasMarked.forEach((el) => el.removeAttribute(SURFACE_FIX_ATTR));
    const mark = [];
    for (const el of batch) {
        surfaceSeen.set(el, `${surfaceEpoch}|${el.getAttribute('class')}`);
        const bg = parseRgb(getComputedStyle(el).backgroundColor);
        const dark = bg && bg.a >= 0.9 && luminance(bg) < surfaceFloorLuminance && !isThemeToken(bg);
        if (!dark) continue;
        if (el.closest(SURFACE_SKIP_ANCESTORS)) continue;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) { if (wasMarked.has(el)) mark.push(el); continue; } // hidden: keep until shown
        if (isCircularOrPill(el, rect)) continue;
        mark.push(el);
    }
    mark.forEach((el) => el.setAttribute(SURFACE_FIX_ATTR, '1'));

    if (pending.length > SURFACE_CHUNK && !surfacePendingRoots.has(root)) {
        surfacePendingRoots.add(root);
        setTimeout(() => { surfacePendingRoots.delete(root); applySurfaceRepair(root, currentSettings); }, 40);
    }
}
