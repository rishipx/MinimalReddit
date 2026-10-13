const THEME_FALLBACKS = Object.freeze({
    page: '#111318',
    surface: '#191c23',
    elevated: '#222730',
    input: '#15181e',
    text: '#eef2f7',
    muted: '#8e98a8',
    border: '#2d3340',
    accent: '#c7f36b',
    link: '#79b8ff'
});

const THEME_VARIABLE_KEYS = Object.freeze([
    'page', 'surface', 'elevated', 'input', 'text', 'muted', 'border', 'accent', 'link'
]);

// Bridges common Reddit design tokens at component boundaries instead of styling descendants.
// Thread colour comes from --mrx-thread-color when multicolour comments are on.
const THEME_REDDIT_VARIABLES = Object.freeze({
    '--color-tone-1': 'text',
    '--color-tone-2': 'muted',
    '--color-tone-3': 'muted',
    '--color-tone-4': 'border',
    '--color-tone-5': 'elevated',
    '--color-tone-6': 'surface',
    '--color-neutral-background': 'page',
    '--color-neutral-background-hover': 'elevated',
    '--color-neutral-background-selected': 'elevated',
    '--color-neutral-background-weak': 'surface',
    '--color-neutral-background-strong': 'elevated',
    '--color-secondary-background': 'surface',
    '--color-primary-background': 'accent',
    '--color-neutral-border': 'border',
    '--color-neutral-content': 'text',
    '--color-neutral-content-weak': 'muted',
    '--color-neutral-content-strong': 'text',
    '--color-input-background': 'input',
    '--color-input-plain-background': 'input',
    '--color-input-border': 'border',
    '--color-input-plain-border': 'border',
    '--color-primary': 'accent',
    '--color-orangered': 'accent',
    '--color-blue': 'link',
    '--color-secondary': 'link',
    '--color-global-white': 'text',
    '--color-global-black': 'page',
    '--color-opposite': 'page',
    '--rpl-input-chip-background-color': 'elevated'
});

const THEME_DOCUMENT_HOSTS = [
    'html', 'body', 'header', 'nav', 'aside', 'shreddit-app', 'shreddit-header', 'reddit-header-large',
    'reddit-sidebar-nav', 'grid-sidebar', 'faceplate-header', 'reddit-search-large', 'shreddit-search-bar',
    '#header', '#left-sidebar', '#left-sidebar-container', '#right-sidebar-container',
    '#subreddit-right-rail__partial', '#right-sidebar-contents', '#flex-left-nav-container'
].join(',\n');

const THEME_DOCUMENT_SURFACES = [
    'main.main', '#main-content', '.grid-container', '.subgrid-container', '.page-container',
    '#left-sidebar', '#left-sidebar-container', '#right-sidebar-container', 'grid-sidebar',
    'reddit-sidebar-nav', 'shreddit-header', 'reddit-header-large', 'faceplate-header',
    '.reddit-search-bar', '.toolbar-container', 'comment-body-header', 'shreddit-comment-tree',
    '#feed-tab-group', '#interest-feed-header'
].join(',\n');

const THEME_CONTENT_SURFACES = [
    'shreddit-post', 'shreddit-comment', '.Comment',
    'div.community-banner', 'faceplate-expandable-section-helper',
    '#right-sidebar-container > aside', '#subreddit-right-rail__partial > aside',
    '#right-sidebar-contents > aside', 'recent-posts', 'shreddit-recent-posts'
].join(',\n');

const THEME_MEDIA_HOSTS = [
    'shreddit-player', 'shreddit-player-2', 'gallery-carousel', 'media-controller', 'media-theme'
].join(',\n');

const THEME_THREAD_ELEMENTS = [
    // Match thin rails only; a generic comment-thread test id can wrap a whole subtree and paint a large rectangle.
    '.threadline', '[class*="threadline" i]', 'comment-tree-line',
    '[data-testid*="thread-line" i]', '[data-testid*="main-thread-line" i]',
    '[data-testid*="branch-line" i]'
].join(',\n');

const THEME_TRANSPARENT_COMPONENTS = [
    '.avatar', 'img.avatar', '[data-testid="comment-avatar"] img', '[data-testid="profile-avatar"]',
    '.profile-avatar', 'shreddit-subreddit-icon', 'shreddit-subreddit-icon__icon', '#time-ago-separator'
].join(',\n');

function getActiveThemeDefinition(settings) {
    if (!settings || !settings.themeEnabled || !settings.activeThemeCSS) return null;

    const index = Number.isInteger(settings.activeThemePreset) ? settings.activeThemePreset : -1;
    if (index >= 0 && index < MRX_THEME_PRESETS.length) {
        const preset = MRX_THEME_PRESETS[index];
        const activeCSS = String(settings.activeThemeCSS).trim();
        if (activeCSS === String(preset.css).trim()) return preset;
    }

    const css = String(settings.activeThemeCSS).trim();
    const exact = MRX_THEME_PRESETS.find((preset, presetIndex) => presetIndex > 0 && preset.css.trim() === css);
    if (exact) return exact;

    return {
        id: 'custom', name: 'Custom', description: '', mode: 'dark', tokens: {}, css: settings.activeThemeCSS
    };
}

function themeTokens(settings) {
    const preset = getActiveThemeDefinition(settings);
    if (!preset) return THEME_FALLBACKS;
    const tokens = { ...(preset.tokens || {}) };
    // Customize-tab colours re-tint the active theme: primary = accent, secondary = links, background = page.
    if (settings.themeColours) {
        if (settings.themePrimaryColor) tokens.accent = settings.themePrimaryColor;
        if (settings.themeSecondaryColor) tokens.link = settings.themeSecondaryColor;
        if (settings.themeBackgroundColor) tokens.page = settings.themeBackgroundColor;
    }
    return Object.fromEntries(THEME_VARIABLE_KEYS.map((key) => [key, tokens[key] || THEME_FALLBACKS[key]]));
}

function buildThemeVariableDeclarations(t, prefix = '--mrx-theme-') {
    return THEME_VARIABLE_KEYS.map((key) => `    ${prefix}${key}: ${t[key]} !important;`).join('\n');
}

function buildRedditVariableDeclarations(t) {
    return Object.entries(THEME_REDDIT_VARIABLES)
        .map(([name, key]) => {
            const value = name === '--color-tone-4' ? `var(--mrx-thread-color, ${t[key]})` : t[key];
            return `    ${name}: ${value} !important;`;
        })
        .join('\n');
}

function buildThemeTokenBlock(settings) {
    const preset = getActiveThemeDefinition(settings);
    if (!preset) return '';
    const t = themeTokens(settings);
    const mode = preset.mode === 'light' ? 'light' : 'dark';

    return `${THEME_DOCUMENT_HOSTS} {\n${buildThemeVariableDeclarations(t)}\n${buildRedditVariableDeclarations(t)}\n    --mrx-theme-color-scheme: ${mode} !important;\n    color-scheme: ${mode} !important;\n}`;
}
