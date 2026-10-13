const FONT_PRESETS = {
    systemui: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
    opensans: '"Open Sans", sans-serif', robotomono: '"Roboto Mono", monospace',
    bricolage: '"Bricolage Grotesque", sans-serif', abel: 'Abel, sans-serif',
    inter: 'Inter, sans-serif', serif: 'serif', ubuntu: 'Ubuntu, sans-serif',
    cursive: 'cursive', helvetica: 'Helvetica, Arial, sans-serif', montserrat: 'Montserrat, sans-serif'
};
const FONT_FACE_FILES = {
    opensans: { family: 'Open Sans', weights: { 400: 'open-sans-400.woff2', 700: 'open-sans-700.woff2' } },
    robotomono: { family: 'Roboto Mono', weights: { 400: 'roboto-mono-400.woff2', 700: 'roboto-mono-700.woff2' } },
    bricolage: { family: 'Bricolage Grotesque', weights: { 400: 'bricolage-grotesque-400.woff2', 700: 'bricolage-grotesque-700.woff2' } },
    abel: { family: 'Abel', weights: { 400: 'abel-400.woff2' } },
    inter: { family: 'Inter', weights: { 400: 'inter-400.woff2', 700: 'inter-700.woff2' } },
    ubuntu: { family: 'Ubuntu', weights: { 400: 'ubuntu-400.woff2', 700: 'ubuntu-700.woff2' } },
    montserrat: { family: 'Montserrat', weights: { 400: 'montserrat-400.woff2', 700: 'montserrat-700.woff2' } }
};

// Values come from colour pickers; anything else falls back so stored data can never inject CSS.
const safeColour = (value, fallback) => (/^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? value : fallback);

// Colour overrides from the Customize tab. Emitted after any theme CSS so they win over it.
function colourOverrideDeclarations(s) {
    if (!s.themeColours) return '';
    const pri = safeColour(s.themePrimaryColor, '#ff4500');
    const sec = safeColour(s.themeSecondaryColor, '#0079d3');
    const bg = safeColour(s.themeBackgroundColor, '');
    return `--color-orangered: ${pri} !important;
            --color-primary: ${pri} !important;
            --color-upvote: ${pri} !important;
            --color-brand-background: ${pri} !important;
            --color-blue: ${sec} !important;
            --color-secondary: ${sec} !important;
            --color-link: ${sec} !important;
            ${bg ? `--color-neutral-background: ${bg} !important;
            --color-neutral-background-weak: ${bg} !important;
            --color-neutral-background-strong: ${bg} !important;` : ''}`;
}

function buildAppearanceCSS(s) {
    const p = [];
    const vars = colourOverrideDeclarations(s);
    if (vars) p.push(`:root, .theme-light, .theme-dark, .theme-beta, body, shreddit-app {\n            ${vars}\n        }`);
    if (s.gradientBackground) {
        p.push(`html, body, shreddit-app, shreddit-app[routename], main.main, #main-content,
            .grid-container, .subgrid-container, .page-container {
            background-color: transparent !important;
            background-image: linear-gradient(135deg, ${safeColour(s.gradientFrom, '#1a1a2e')}, ${safeColour(s.gradientTo, '#16213e')}) !important;
            background-attachment: fixed !important; background-size: cover !important;
        }`);
        p.push(`shreddit-post, shreddit-comment, #right-sidebar-container > * { background-color: rgba(0,0,0,0.35) !important; }`);
    } else if (s.bgImageData) {
        p.push(`html, body, shreddit-app, shreddit-app[routename], main.main, #main-content,
            .grid-container, .subgrid-container, .page-container {
            background-color: transparent !important; background-image: none !important;
        }`);
        p.push(`body::before { content: ""; position: fixed; inset: -30px;
            background-image: url("${s.bgImageData}") !important;
            background-size: cover !important; background-position: center !important;
            background-attachment: fixed !important; z-index: -2 !important; pointer-events: none;
            ${s.bgBlur > 0 ? `filter: blur(${s.bgBlur}px) !important;` : ''}
        }`);
    } else if (s.bgColor) {
        p.push(`html, body, shreddit-app, shreddit-app[routename], main.main, #main-content,
            .grid-container, .subgrid-container, .page-container {
            background-color: ${safeColour(s.bgColor, 'transparent')} !important;
        }`);
    }
    return p.join('\n');
}

function buildDocCSS(s) {
    // Master Power is a global kill switch for all extension styling.
    if (!s.masterPower) return '';
    const p = [];

    if (s.fontSelection === 'custom' && s.customFontData && s.customFontName) {
        const safe = s.customFontName.replace(/["\\\n\r]/g, '');
        p.push(`@font-face { font-family: "${safe}"; src: url("${s.customFontData}"); font-display: swap; }`);
        p.push(`html, body { font-family: "${safe}" !important; }`);
        p.push(`input, textarea, select, button { font-family: "${safe}" !important; }`);
    } else if (s.fontSelection && FONT_PRESETS[s.fontSelection]) {
        const b = FONT_FACE_FILES[s.fontSelection];
        if (b) for (const [w, f] of Object.entries(b.weights)) {
            p.push(`@font-face { font-family: "${b.family}"; src: url("${browserAPI.runtime.getURL('assets/fonts/' + f)}") format("woff2"); font-weight: ${w}; font-display: swap; }`);
        }
        p.push(`html, body { font-family: ${FONT_PRESETS[s.fontSelection]} !important; }`);
        p.push(`input, textarea, select, button { font-family: ${FONT_PRESETS[s.fontSelection]} !important; }`);
    }

    if (typeof s.borderRadius === 'number' && s.borderRadius >= 0) {
        p.push(`:root, .theme-light, .theme-dark, .theme-beta {
            --radius-sm: ${s.borderRadius}px !important;
            --radius-md: ${s.borderRadius}px !important;
            --radius-lg: ${s.borderRadius}px !important;
            --radius-full: ${s.borderRadius}px !important;
            --re-theme-border-radius: ${s.borderRadius}px !important;
        }`);
    }

    if (s.resizePostContent > 0) p.push(`shreddit-post [slot="text-body"], shreddit-post .md, shreddit-post [data-post-click-location="text-body"] { font-size: ${s.resizePostContent}px !important; }`);
    if (s.resizeComments > 0) p.push(`shreddit-comment [slot="comment"], shreddit-comment .md { font-size: ${s.resizeComments}px !important; }`);
    if (s.postContentWeight) p.push(`shreddit-post [slot="text-body"], shreddit-post .md { font-weight: ${s.postContentWeight} !important; }`);
    if (s.commentWeight) p.push(`shreddit-comment [slot="comment"], shreddit-comment .md { font-weight: ${s.commentWeight} !important; }`);

    {
        const widthMode = ['thin', 'normal', 'hidden'].includes(s.scrollbarWidth) ? s.scrollbarWidth : 'thin';
        const w = widthMode === 'hidden' ? 0 : (widthMode === 'normal' ? 14 : 3);
        if (widthMode === 'hidden') {
            p.push(`html, body { scrollbar-width: none !important; } html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0 !important; height: 0 !important; }`);
        } else {
            p.push(`html, body { scrollbar-width: ${widthMode === 'normal' ? 'auto' : 'thin'} !important; scrollbar-color: rgba(140,140,150,0.5) transparent !important; }
                html::-webkit-scrollbar, body::-webkit-scrollbar { width: ${w}px !important; height: ${w}px !important; }
                html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: transparent !important; }
                html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb {
                    background-color: rgba(140,140,150,0.5) !important; border-radius: 999px !important;
                    ${w > 4 ? `border: ${Math.max(1, Math.round(w / 4))}px solid transparent !important; background-clip: padding-box !important;` : ''}
                }`);
        }
    }

    const resizeActive = s.contentWidthMode === 'mega' || s.contentWidthMode === 'custom';
    if (resizeActive) {
        p.push(`
@media (min-width: 960px) {
    .grid-container:not(.grid-full) { max-width: 100vw; }
    shreddit-app .grid-container:not(.grid-full) .subgrid-container,
    shreddit-app[routename="compose_message"] .subgrid-container {
        width: 100%; min-width: 0; max-width: revert; gap: revert; padding: revert;
    }
    shreddit-app main.main > div { max-width: revert; }
    div.main-container.grid,
    div.main-container.flex {
        display: grid;
        grid-template-columns: 1fr minmax(0, 316px);
        gap: 1.25rem;
        margin: 0 auto;
    }
    .masthead { align-self: center; padding: 0 !important; }
    .masthead > div, .masthead > section { margin: 0 auto; }
    shreddit-gallery-carousel > li { padding: 0 !important; }
    community-appearance-entrypoint[target="banner"] { margin-bottom: 5rem !important; }

    shreddit-app .main-container,
    shreddit-app[routename="frontpage"] .main-container,
    shreddit-app[routename="all"] .main-container,
    shreddit-app[routename="popular"] .main-container,
    shreddit-app[routename="popular"] .masthead > div,
    shreddit-app[pagetype="search_results"] .main-container,
    shreddit-app[pagetype="search_results"] .masthead > div,
    shreddit-app[pagetype="post_submit"] .main-container,
    shreddit-app[routename="inbox"] .main-container,
    shreddit-app[routename^="settings-"] .main-container,
    shreddit-app[routename="community_page"] .main-container,
    shreddit-app[pagetype="explore"] .main-container,
    shreddit-app[routename="compose_message"] .main-container,
    shreddit-app[routename^="subreddit"] .main-container,
    shreddit-app[routename^="subreddit"] .masthead,
    shreddit-app[routename="profile_overview"] .main-container,
    shreddit-app[routename="profile_posts"] .main-container,
    shreddit-app[routename="profile_comments"] .main-container,
    shreddit-app[routename="profile_saved"] .main-container,
    shreddit-app[routename="profile_hidden"] .main-container,
    shreddit-app[routename="profile_upvoted"] .main-container,
    shreddit-app[routename="profile_downvoted"] .main-container,
    shreddit-app[routename="topic"] .main-container,
    shreddit-app[pagetype="custom_feed"] .main-container,
    shreddit-app[pagetype="custom_feed"] div.masthead custom-feed-header {
        max-width: var(--re-content-width, none);
    }
    shreddit-app[routename="post_page"] .main-container,
    shreddit-app[routename="comments_page"] .main-container,
    shreddit-app[routename="profile_post_page"] .main-container,
    shreddit-app[routename="profile_post_page_comments"] .main-container,
    shreddit-app[routename="post_stats"] .main-container,
    shreddit-app[routename="CommentStats"] .main-container {
        max-width: var(--re-post-width, none);
    }
    main.main#main-content { max-width: 100%; }
}`);
    }

    if (s.themeEnabled && s.activeThemeCSS) p.push(s.activeThemeCSS);
    const themeDocumentCSS = buildThemeDocumentCSS(s);
    if (themeDocumentCSS) p.push(themeDocumentCSS);
    p.push(buildAppearanceCSS(s));
    return p.join('\n');
}
