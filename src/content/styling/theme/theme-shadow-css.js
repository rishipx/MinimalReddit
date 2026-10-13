function buildThemeShadowCSS(settings) {
    const preset = getActiveThemeDefinition(settings);
    if (!preset) return '';

    const t = themeTokens(settings);
    const mode = preset.mode === 'light' ? 'light' : 'dark';
    const variables = buildThemeVariableDeclarations(t);
    const redditVariables = buildRedditVariableDeclarations(t);

    return `
/* Tokens sit at the component boundary and inherit; no blanket descendant rules, which would restyle native media controls. */
:host {
    color: ${t.text} !important;
    color-scheme: ${mode} !important;
${variables}
${redditVariables}
}

:host {
    border-color: ${t.border} !important;
}

html, body, main, section, article, header, nav, aside,
shreddit-post, shreddit-comment, shreddit-comment-tree,
comment-body-header, .reddit-search-bar, .grid-container, .subgrid-container, .page-container {
    color: ${t.text} !important;
}

main, [role="main"] {
    background-color: ${t.page} !important;
}

section, article, aside, [role="region"], [role="dialog"],
shreddit-post, shreddit-comment, shreddit-comment-tree,
comment-body-header, .community-banner {
    background-color: ${t.surface} !important;
    border-color: ${t.border} !important;
}

/* Section wrappers around comment rails stay see-through; theme the comment hosts, not the gutters. */
:host(shreddit-comment-tree) section,
:host(shreddit-comment-tree) article,
:host(shreddit-comment-tree) aside,
:host(shreddit-comment-tree) [role="region"] {
    background-color: transparent !important;
    border-color: transparent !important;
}

header, nav, [role="banner"], [role="navigation"] {
    background-color: ${t.page} !important;
    border-color: ${t.border} !important;
}

${buildSearchCSS(t, mode)}
${buildSpecificControlCSS(t, mode)}

/* Component-specific fixes for the current Reddit search/header stack. */
:host(reddit-search-large),
:host(shreddit-search-bar) {
    color: ${t.text} !important;
    background: ${t.input} !important;
    background-color: ${t.input} !important;
    background-image: none !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
}

:host(reddit-search-large) .fallback-with-gradient,
:host(shreddit-search-bar) .fallback-with-gradient,
:host(reddit-search-large) .search-input-container,
:host(shreddit-search-bar) .search-input-container,
:host(reddit-search-large) [part*="search" i],
:host(shreddit-search-bar) [part*="search" i] {
    background-image: none !important;
    box-shadow: none !important;
}

:host(reddit-search-large) input,
:host(shreddit-search-bar) input,
:host(reddit-search-large) #search-input-chip,
:host(shreddit-search-bar) #search-input-chip {
    color: ${t.text} !important;
    background-color: ${t.elevated} !important;
    background-image: none !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
}

:host(reddit-search-large) input,
:host(shreddit-search-bar) input {
    background-color: transparent !important;
}

/* The home/feed tabs are their own UI component in the current app. */
:host(shreddit-feed) [role="tablist"],
:host(shreddit-feed) #feed-tab-group,
:host(shreddit-feed) #interest-feed-header {
    color: ${t.text} !important;
    background-color: ${t.page} !important;
    border-color: ${t.border} !important;
}

:host(shreddit-feed) [role="tab"] {
    color: ${t.text} !important;
    background-color: transparent !important;
}

:host(shreddit-feed) [role="tab"][aria-selected="true"] {
    border-bottom-color: ${t.accent} !important;
}

/* Vote groups can live inside the post/comment shadow root, so they are scoped to the host. Comment votes stay bare;
   the post vote group is a pill (vote-pill JS overrides it with the measured colour). */
:host(shreddit-post) :where(div, span, section):has(> button[upvote]):has(> button[downvote]),
:host(shreddit-post) :where(div, span, section):has(> [aria-label*="upvote" i]):has(> [aria-label*="downvote" i]) {
    background-color: var(--button-color-background, var(--color-secondary-background, ${t.elevated})) !important;
    border-color: transparent !important;
    border-radius: var(--re-theme-border-radius, 9999px) !important;
    box-shadow: none !important;
}

:host(shreddit-comment) :where(div, span, section):has(> button[upvote]):has(> button[downvote]),
:host(shreddit-comment) :where(div, span, section):has(> [aria-label*="upvote" i]):has(> [aria-label*="downvote" i]) {
    background: transparent !important;
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

:host(shreddit-post) :where(div, span, section):has(> button[upvote]):has(> button[downvote]) > *,
:host(shreddit-comment) :where(div, span, section):has(> button[upvote]):has(> button[downvote]) > *,
:host(shreddit-post) :where(div, span, section):has(> [aria-label*="upvote" i]):has(> [aria-label*="downvote" i]) > *,
:host(shreddit-comment) :where(div, span, section):has(> [aria-label*="upvote" i]):has(> [aria-label*="downvote" i]) > * {
    background-color: transparent !important;
}

:host(shreddit-post) :is(button[upvote], button[downvote], [aria-label*="upvote" i], [aria-label*="downvote" i]),
:host(shreddit-comment) :is(button[upvote], button[downvote], [aria-label*="upvote" i], [aria-label*="downvote" i]) {
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

/* Comment composer/sort region. */
:host(shreddit-comment-tree) :is(textarea, input[placeholder*="Join the conversation" i], input[placeholder*="Search Comments" i], [contenteditable="true"]) {
    color: ${t.text} !important;
    background: ${t.elevated} !important;
    background-color: ${t.elevated} !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
    caret-color: ${t.accent} !important;
}

:host(shreddit-comment-tree) :is(textarea, input[placeholder*="Join the conversation" i], input[placeholder*="Search Comments" i])::placeholder {
    color: ${t.muted} !important;
    opacity: 1 !important;
}

:host(shreddit-comment-tree) :is(shreddit-sort-dropdown, shreddit-comments-sort-dropdown, [trigger-id="comment-sort-button"]) {
    color: ${t.text} !important;
    background: ${t.elevated} !important;
    background-color: ${t.elevated} !important;
    border-color: ${t.border} !important;
}

/* Collapsed comment host and its expander shell. */
:host(shreddit-comment[collapsed]),
:host(shreddit-comment[collapsed="true"]),
:host(shreddit-comment[data-collapsed="true"]) {
    color: ${t.text} !important;
    background: ${t.surface} !important;
    background-color: ${t.surface} !important;
    border-color: ${t.border} !important;
}

:host(shreddit-comment[collapsed]) button,
:host(shreddit-comment[collapsed="true"]) button,
:host(shreddit-comment[data-collapsed="true"]) button,
:host(shreddit-comment[collapsed]) [role="button"],
:host(shreddit-comment[collapsed="true"]) [role="button"],
:host(shreddit-comment[data-collapsed="true"]) [role="button"] {
    background: transparent !important;
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

/* Wrappers around the expander button stay on the active surface. */
:host(shreddit-comment[collapsed]) > :where(div, section, article),
:host(shreddit-comment[collapsed="true"]) > :where(div, section, article),
:host(shreddit-comment[data-collapsed="true"]) > :where(div, section, article) {
    background-color: ${t.surface} !important;
}

/* Thread rails remain transparent so the surface shows through. */
${THEME_THREAD_ELEMENTS} {
    background: transparent !important;
    background-color: transparent !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
}

${THEME_TRANSPARENT_COMPONENTS} {
    background: transparent !important;
    background-color: transparent !important;
}

/* Native media renderer: no theme control styling is applied here. */
:host(shreddit-player),
:host(shreddit-player-2),
:host(gallery-carousel),
:host(media-controller),
:host(media-theme) {
    background: transparent !important;
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

:host(shreddit-player) video,
:host(shreddit-player-2) video {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    filter: none !important;
    mix-blend-mode: normal !important;
    background: transparent !important;
    max-width: 100% !important;
}

video::cue {
    color: ${t.text} !important;
    background: rgba(0, 0, 0, 0.72) !important;
}
`;
}
