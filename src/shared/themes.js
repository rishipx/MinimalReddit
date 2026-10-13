// Theme definitions shared by the popup and the content runtime. Index 0 is "Default" and disables theming.

(function (g) {
    'use strict';

    const themes = [
        {
            id: 'default',
            name: 'Default',
            description: 'Restore Reddit\'s normal styling and disable the active preset.',
            mode: 'dark',
            tokens: {},
            css: ''
        },
        {
            id: 'zen-dark',
            name: 'Zen Dark',
            description: 'Minimal dark surfaces, soft contrast and a calm lime accent.',
            mode: 'dark',
            tokens: {
                page: '#0f1115', surface: '#171a21', elevated: '#202632', input: '#11151b',
                text: '#ffffff', muted: '#b4bfce', border: '#292f3a', accent: '#c7f36b', link: '#9dd8ff'
            },
            css: `:root, .theme-dark, .theme-light, .theme-beta {
    --color-tone-1: #eceff4 !important;
    --color-tone-2: #b8c0cc !important;
    --color-tone-3: #8e98a8 !important;
    --color-tone-4: #566173 !important;
    --color-tone-5: #303845 !important;
    --color-tone-6: #171a21 !important;
    --color-neutral-background: #0f1115 !important;
    --color-neutral-background-hover: #171a21 !important;
    --color-neutral-border: #292f3a !important;
    --color-primary: #c7f36b !important;
}
body, shreddit-app, #main-content { background-color: #0f1115 !important; color: #eef2f7 !important; }
.grid-container, .subgrid-container, .page-container { background-color: #0f1115 !important; }
shreddit-post, shreddit-comment, .Comment, div.community-banner { background-color: #171a21 !important; border-color: #292f3a !important; }
`
        },
        {
            id: 'oled-black',
            name: 'OLED Black',
            description: 'True black for OLED screens.',
            mode: 'dark',
            tokens: {
                page: '#000000', surface: '#050505', elevated: '#0d0d0d', input: '#080808',
                text: '#ffffff', muted: '#bdbdbd', border: '#1a1a1a', accent: '#f2f2f2', link: '#9ed8ff'
            },
            css: `body, shreddit-app, #main-content { background-color: #000000 !important; }
.grid-container, .subgrid-container, .page-container { background-color: #000000 !important; }
shreddit-post, .Comment, div.community-banner { background-color: #050505 !important; border-color: #1a1a1a !important; }
:root, .theme-light, .theme-dark, .theme-beta {
    --color-tone-1: #f2f2f2 !important;
    --color-tone-2: #b8b8b8 !important;
    --color-tone-3: #8a8a8a !important;
    --color-neutral-background: #000000 !important;
    --color-neutral-background-hover: #0d0d0d !important;
    --color-neutral-border: #1a1a1a !important;
}`
        },
        {
            id: 'solarized-dark',
            name: 'Solarized Dark',
            description: 'Deep teal surfaces with crisp, readable text and calm blue accents.',
            mode: 'dark',
            tokens: {
                page: '#002b36', surface: '#073642', elevated: '#0a4a5a', input: '#06333e',
                text: '#ffffff', muted: '#b8c9c8', border: '#0a4a5a', accent: '#2aa198', link: '#268bd2'
            },
            css: `body, shreddit-app, #main-content { background-color: #002b36 !important; }
shreddit-post, .Comment { background-color: #073642 !important; border-color: #0a4a5a !important; }
:root { --color-tone-1: #eee8d5 !important; --color-neutral-background: #002b36 !important; }`
        },
        {
            id: 'nord',
            name: 'Nord',
            description: 'Muted arctic blue-grays.',
            mode: 'dark',
            tokens: {
                page: '#2e3440', surface: '#3b4252', elevated: '#434c5e', input: '#353c4a',
                text: '#ffffff', muted: '#d8dee9', border: '#4c566a', accent: '#88c0d0', link: '#81a1c1'
            },
            css: `body, shreddit-app, #main-content { background-color: #2e3440 !important; }
shreddit-post, .Comment { background-color: #3b4252 !important; border-color: #4c566a !important; }
:root { --color-tone-1: #eceff4 !important; --color-neutral-background: #2e3440 !important; }`
        },
        {
            id: 'dracula',
            name: 'Dracula',
            description: 'Deep purple-gray with vivid accents.',
            mode: 'dark',
            tokens: {
                page: '#282a36', surface: '#343746', elevated: '#44475a', input: '#2f3140',
                text: '#ffffff', muted: '#d7c2ff', border: '#44475a', accent: '#bd93f9', link: '#8be9fd'
            },
            css: `body, shreddit-app, #main-content { background-color: #282a36 !important; }
shreddit-post, .Comment { background-color: #343746 !important; border-color: #44475a !important; }
:root { --color-tone-1: #f8f8f2 !important; --color-neutral-background: #282a36 !important; }`
        }
    ];

    g.MRX_THEME_PRESETS = Object.freeze(themes.map((theme) => Object.freeze({
        ...theme,
        tokens: Object.freeze({ ...(theme.tokens || {}) })
    })));
})(typeof globalThis !== 'undefined' ? globalThis : window);
