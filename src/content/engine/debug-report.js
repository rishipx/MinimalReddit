// Report behind the popup's "Copy debug info". Page text, links and block lists are never included.

const DEBUG_PRIVATE_SETTINGS = new Set([
    'customFontData', 'customFontName', 'bgImageData', 'activeThemeCSS',
    'blockedPostKeywords', 'blockedPostUsers', 'blockedSubreddits',
    'blockedCommentKeywords', 'blockedCommentUsers'
]);
const DEBUG_SAMPLE_LIMIT = 5;
const DEBUG_HTML_LIMIT = 700;

// Drops link targets and long text runs so a sample shows structure, not content.
function sanitizeDebugHtml(html) {
    return String(html || '')
        .replace(/\s(href|src|srcset|content-href|permalink|post-title|author|data-url)="[^"]*"/gi, ' $1="…"')
        .replace(/>([^<]{25,})</g, '>…<')
        .slice(0, DEBUG_HTML_LIMIT);
}

function debugRoots() {
    return Array.from(knownRoots).filter((root) => root === document || (root.host && root.host.isConnected));
}

function debugQueryAll(selector) {
    const out = [];
    for (const root of debugRoots()) {
        try { root.querySelectorAll(selector).forEach((el) => out.push(el)); } catch (e) { /* invalid selector */ }
    }
    return out;
}

function describeDebugElement(el) {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        class: (el.getAttribute('class') || '').slice(0, 120) || undefined,
        background: cs.backgroundColor,
        display: cs.display,
        size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        html: sanitizeDebugHtml(el.outerHTML)
    };
}

// Child geometry of the rows that hold the post/comment action buttons, to diagnose uneven spacing.
function describeActionRows() {
    const rows = new Set();
    debugQueryAll(`${AWARD_SELECTOR}, .${POST_OPTION_CLASS}`).forEach((el) => { if (el.parentElement) rows.add(el.parentElement); });
    return Array.from(rows).slice(0, 3).map((row) => ({
        row: row.tagName.toLowerCase() + (row.className && typeof row.className === 'string' ? '.' + row.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
        gap: getComputedStyle(row).columnGap,
        children: Array.from(row.children).slice(0, 12).map((c) => {
            const cs = getComputedStyle(c), r = c.getBoundingClientRect();
            return { tag: c.tagName.toLowerCase(), id: c.id || undefined, width: Math.round(r.width), marginL: cs.marginLeft, marginR: cs.marginRight, display: cs.display, labelHidden: c.hasAttribute('data-mrx-button-label-hidden') || undefined };
        })
    }));
}

// Dark-looking backgrounds the surface repair left alone (translucent, skipped ancestors, pills), capped for speed.
function describeUnfixedDark() {
    if (typeof prepareSurfaceTheme !== 'function' || !prepareSurfaceTheme(currentSettings)) return [];
    const out = [];
    let scanned = 0;
    for (const root of debugRoots()) {
        for (const el of root.querySelectorAll('*')) {
            if (++scanned > 4000 || out.length >= DEBUG_SAMPLE_LIMIT) return out;
            if (el.hasAttribute(SURFACE_FIX_ATTR) || SURFACE_SKIP_TAGS.test(el.tagName)) continue;
            const bg = parseRgb(getComputedStyle(el).backgroundColor);
            if (!bg || bg.a < 0.05 || luminance(bg) >= surfaceFloorLuminance || isThemeToken(bg)) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 40 || r.height < 12) continue;
            out.push({ ...describeDebugElement(el), skippedAncestor: !!el.closest(SURFACE_SKIP_ANCESTORS) });
        }
    }
    return out;
}

function collectDebugInfo() {
    const settings = {};
    for (const [key, value] of Object.entries(currentSettings || {})) {
        settings[key] = DEBUG_PRIVATE_SETTINGS.has(key)
            ? (typeof value === 'string' ? `<${value.length} chars>` : '<set>')
            : value;
    }

    const selectorCounts = {};
    for (const [name, selector] of Object.entries(MRX_DEBUG_SELECTORS)) selectorCounts[name] = debugQueryAll(selector).length;

    const surfaceFixed = debugQueryAll('[data-mrx-surface-fix]');
    const votePills = debugQueryAll('[data-mrx-vote-pill]');
    const labelHidden = debugQueryAll('[data-mrx-button-label-hidden]');
    const awardCompact = debugQueryAll('[data-mrx-award-compact]');

    const theme = typeof getActiveThemeDefinition === 'function' ? getActiveThemeDefinition(currentSettings) : null;
    return {
        generatedAt: new Date().toISOString(),
        version: browserAPI.runtime.getManifest().version,
        userAgent: navigator.userAgent,
        page: location.origin + location.pathname,
        routename: (document.querySelector('shreddit-app') || {}).getAttribute?.('routename') || null,
        shadowRootsTracked: debugRoots().length,
        theme: theme ? { id: theme.id, mode: theme.mode, tokens: themeTokens(currentSettings) } : null,
        settings,
        selectorCounts,
        marked: {
            surfaceFix: surfaceFixed.length,
            votePills: votePills.length,
            buttonLabelHidden: labelHidden.length,
            awardCompact: awardCompact.length,
            profileAvatar: debugQueryAll('[data-mrx-profile-avatar]').length,
            commentThreads: debugQueryAll('[data-mrx-thread]').length,
            hiddenBackButtons: debugQueryAll('[data-mrx-hideBack]').length
        },
        actionRows: describeActionRows(),
        unfixedDark: describeUnfixedDark(),
        samples: {
            surfaceFix: surfaceFixed.slice(0, DEBUG_SAMPLE_LIMIT).map(describeDebugElement),
            votePills: votePills.slice(0, DEBUG_SAMPLE_LIMIT).map(describeDebugElement),
            awardButtons: debugQueryAll(AWARD_SELECTOR).slice(0, DEBUG_SAMPLE_LIMIT).map(describeDebugElement),
            voteButtons: debugQueryAll(VOTE_PILL_UP).slice(0, 2).map((el) => describeDebugElement(el.parentElement || el))
        }
    };
}
