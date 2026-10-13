function readComputedColor(element, property, fallback) {
    if (!element) return fallback;
    const value = getComputedStyle(element).getPropertyValue(property).trim();
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return fallback;
    return value;
}

function syncThemeRuntimeVariables(settings) {
    const root = document.documentElement;
    const preset = getActiveThemeDefinition(settings);
    if (!root || !preset) {
        if (root) THEME_VARIABLE_KEYS.forEach((key) => root.style.removeProperty(`--mrx-theme-${key}`));
        return;
    }

    const t = themeTokens(settings);
    if (preset.id !== 'custom') {
        THEME_VARIABLE_KEYS.forEach((key) => root.style.setProperty(`--mrx-theme-${key}`, t[key], 'important'));
        return;
    }

    const body = document.body;
    const panel = document.querySelector('#main-content, .grid-container, .subgrid-container, .page-container');
    const post = document.querySelector('shreddit-post, shreddit-comment, .Comment');
    const values = {
        page: readComputedColor(body, 'background-color', readComputedColor(panel, 'background-color', t.page)),
        surface: readComputedColor(post, 'background-color', readComputedColor(panel, 'background-color', t.surface)),
        elevated: readComputedColor(document.querySelector('.toolbar-container, #feed-tab-group, [placeholder*="Search Comments" i]'), 'background-color', t.elevated),
        input: readComputedColor(document.querySelector('.reddit-search-bar, reddit-search-large, input, textarea'), 'background-color', t.input),
        text: readComputedColor(body, 'color', t.text),
        muted: t.muted,
        border: readComputedColor(post, 'border-top-color', t.border),
        accent: t.accent,
        link: readComputedColor(document.querySelector('a'), 'color', t.link)
    };

    Object.entries(values).forEach(([key, value]) => {
        if (value) root.style.setProperty(`--mrx-theme-${key}`, value, 'important');
    });
}
