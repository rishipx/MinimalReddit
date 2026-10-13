function buildThemeDocumentCSS(settings) {
    const preset = getActiveThemeDefinition(settings);
    if (!preset) return '';

    const t = themeTokens(settings);
    const mode = preset.mode === 'light' ? 'light' : 'dark';
    const builtin = preset.id !== 'custom';

    return `${buildThemeTokenBlock(settings)}

:root {
    color-scheme: ${mode} !important;
}

html, body, shreddit-app,
main.main, #main-content, .grid-container, .subgrid-container, .page-container {
    color: ${t.text} !important;
    background-color: ${t.page} !important;
}

html, body {
    background-image: none !important;
}

${THEME_DOCUMENT_SURFACES} {
    color: ${t.text} !important;
    background-color: ${t.surface} !important;
    border-color: ${t.border} !important;
}

header,
shreddit-header,
reddit-header-large,
reddit-sidebar-nav,
grid-sidebar,
#left-sidebar,
#left-sidebar-container,
#right-sidebar-container {
    background-color: ${t.page} !important;
    color: ${t.text} !important;
    border-color: ${t.border} !important;
}

${THEME_CONTENT_SURFACES} {
    color: ${t.text} !important;
    background-color: ${t.surface} !important;
    border-color: ${t.border} !important;
}

/* Shells between components stay transparent: one source of truth per surface. */
shreddit-feed,
shreddit-comments,
shreddit-comment-tree > div,
#main-content > div,
.main-container,
.masthead,
.toolbar-container,
${THEME_TRANSPARENT_COMPONENTS} {
    color: inherit !important;
    background-color: transparent !important;
    border-color: transparent !important;
}

/* Current search/header surfaces. */
${buildSearchCSS(t, mode)}

/* Comment sort, composer, vote groups and action controls. */
${buildSpecificControlCSS(t, mode)}

/* Collapsed-comment shell: Reddit paints it black; keep it on the comment surface, expander glyph transparent. */
shreddit-comment[collapsed],
shreddit-comment[collapsed="true"],
shreddit-comment[data-collapsed="true"],
shreddit-comment[collapsed] > div,
shreddit-comment[collapsed="true"] > div,
shreddit-comment[data-collapsed="true"] > div {
    color: ${t.text} !important;
    background-color: ${t.surface} !important;
    border-color: ${t.border} !important;
}

shreddit-comment[collapsed] button,
shreddit-comment[collapsed="true"] button,
shreddit-comment[data-collapsed="true"] button,
shreddit-comment[collapsed] [role="button"],
shreddit-comment[collapsed="true"] [role="button"],
shreddit-comment[data-collapsed="true"] [role="button"] {
    color: ${t.text} !important;
    background: transparent !important;
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

/* Thread rails are transparent; line colour comes from --mrx-thread-color when multicolour is on. */
${THEME_THREAD_ELEMENTS} {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
}

/* Native media/gallery containers stay outside theming so their controls look native. */
${THEME_MEDIA_HOSTS} {
    background: transparent !important;
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

${THEME_MEDIA_HOSTS} img,
${THEME_MEDIA_HOSTS} video,
${THEME_MEDIA_HOSTS} iframe,
${THEME_MEDIA_HOSTS} canvas {
    filter: none !important;
    mix-blend-mode: normal !important;
}

${builtin ? '/* Built-in preset CSS is intentionally replaced by token-driven component CSS. */' : String(preset.css)}

a { color: ${t.link} !important; }
a:hover { color: ${t.accent} !important; }
a:visited { color: ${t.link} !important; }

::selection {
    background: ${t.accent} !important;
    color: ${t.page} !important;
}

:root {
${buildThemeVariableDeclarations(t)}
${buildRedditVariableDeclarations(t)}
    --mrx-theme-color-scheme: ${mode} !important;
}
`;
}
