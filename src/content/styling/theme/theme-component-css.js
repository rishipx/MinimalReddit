function buildSearchCSS(t, mode, prefix = '') {
    const hostPrefix = prefix ? `${prefix} ` : '';
    return `
${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) {
    color: ${t.text} !important;
    background: ${t.input} !important;
    background-color: ${t.input} !important;
    background-image: none !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
    color-scheme: ${mode} !important;
}

${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) .search-input,
${hostPrefix}.search-input,
${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) [data-testid*="search-input" i] {
    color: ${t.text} !important;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) #search-input-chip,
${hostPrefix}#search-input-chip {
    color: ${t.text} !important;
    background: ${t.elevated} !important;
    background-color: ${t.elevated} !important;
    background-image: none !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
    --rpl-input-chip-background-color: ${t.elevated} !important;
}

${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) input,
${hostPrefix}input[placeholder*="Search Reddit" i],
${hostPrefix}input[placeholder*="Search in r/" i] {
    color: ${t.text} !important;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    border-color: transparent !important;
    box-shadow: none !important;
    caret-color: ${t.accent} !important;
    color-scheme: ${mode} !important;
}

${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) input::placeholder,
${hostPrefix}input[placeholder*="Search Reddit" i]::placeholder,
${hostPrefix}input[placeholder*="Search in r/" i]::placeholder {
    color: ${t.muted} !important;
    opacity: 1 !important;
}

/* Reddit's newer search component uses a gradient wrapper around the field. */
${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) .fallback-with-gradient,
${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) .search-input-container,
${hostPrefix}:is(.reddit-search-bar, reddit-search-large, shreddit-search-bar) [part*="search" i] {
    background-image: none !important;
    box-shadow: none !important;
}
`;
}

function buildSpecificControlCSS(t, mode, prefix = '') {
    const s = prefix ? `${prefix} ` : '';
    return `
${s}:is(shreddit-sort-dropdown, shreddit-comments-sort-dropdown, [trigger-id="comment-sort-button"]) {
    color: ${t.text} !important;
    background: ${t.elevated} !important;
    background-color: ${t.elevated} !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
    color-scheme: ${mode} !important;
}

${s}:is(shreddit-sort-dropdown, shreddit-comments-sort-dropdown, [trigger-id="comment-sort-button"]) button,
${s}:is(shreddit-sort-dropdown, shreddit-comments-sort-dropdown, [trigger-id="comment-sort-button"]) [role="button"] {
    color: ${t.text} !important;
    background: transparent !important;
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

${s}:is(shreddit-post-share-button, shreddit-comment-share-button,
shreddit-post-comment-button, shreddit-comment-tree-button,
shreddit-comment-save-button, shreddit-post-save-button,
shreddit-post-repost-button, award-button) {
    color: ${t.text} !important;
    background-color: transparent !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
}

/* Theme the score group shell; the score and both vote buttons share one transparent surface. */
${s}:is(shreddit-post, shreddit-comment) :where(div, span, section):has(> button[upvote]):has(> button[downvote]),
${s}:is(shreddit-post, shreddit-comment) :where(div, span, section):has(> [aria-label*="upvote" i]):has(> [aria-label*="downvote" i]) {
    background: transparent !important;
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

${s}:is(shreddit-post, shreddit-comment) :where(div, span, section):has(> button[upvote]):has(> button[downvote]) > *,
${s}:is(shreddit-post, shreddit-comment) :where(div, span, section):has(> [aria-label*="upvote" i]):has(> [aria-label*="downvote" i]) > * {
    background-color: transparent !important;
}

${s}:is(shreddit-post, shreddit-comment) :is(button[upvote], button[downvote],
[aria-label*="upvote" i], [aria-label*="downvote" i]) {
    background-color: transparent !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
}

/* Composer and comment-search controls share the comment surface, not the generic input background. */
${s}shreddit-comment-tree :is(textarea, input[placeholder*="Join the conversation" i], [contenteditable="true"]),
${s}:is(shreddit-comment-composer, comment-composer, faceplate-composer, faceplate-textarea) :is(textarea, input, [contenteditable="true"]),
${s}textarea[placeholder*="Join the conversation" i],
${s}input[placeholder*="Search Comments" i] {
    color: ${t.text} !important;
    background: ${t.elevated} !important;
    background-color: ${t.elevated} !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
    caret-color: ${t.accent} !important;
    color-scheme: ${mode} !important;
}

${s}textarea[placeholder*="Join the conversation" i]::placeholder,
${s}input[placeholder*="Search Comments" i]::placeholder {
    color: ${t.muted} !important;
    opacity: 1 !important;
}

${s}shreddit-comment-tree :is(faceplate-search-input, [role="search"], [data-testid*="comment-search" i]) {
    color: ${t.text} !important;
    background: transparent !important;
    background-color: transparent !important;
    border-color: ${t.border} !important;
    box-shadow: none !important;
}
`;
}
