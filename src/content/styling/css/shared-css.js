function buildSharedCSS(s) {
    if (!s.masterPower) return '';
    const p = [];

    if (s.nonStickyHeader) {
        p.push(`
shreddit-app reddit-header-large {
    position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important;
    width: auto !important; max-width: 100% !important; box-sizing: border-box !important;
}
/* Taking the header out of flow must never create a horizontal scrollbar. */
html { overflow-x: clip !important; }
shreddit-app :not(.re-header-menu) > reddit-sidebar-nav,
shreddit-app div#flex-left-nav-container {
    position: sticky; height: 100vh !important; top: 0 !important;
}
shreddit-app #right-sidebar-container { height: initial; max-height: initial !important; }
/* The sidebar is sized as 100vh minus the header; with the header scrolling away it gets the full height. */
reddit-sidebar-nav, #flex-left-nav-container, #left-sidebar-container { --shreddit-header-height: 0px; --header-height: 0px; }
`);
    }

    if (typeof s.sideMenuWidth === 'number' && s.sideMenuWidth > 0) {
        p.push(`
@media (min-width: 1200px) {
    div.grid-container:not(.grid-full),
    div.grid-container:not(.grid-full).flex-nav-expanded {
        --flex-nav-width: var(--re-side-menu-width);
    }
}
flex-left-nav-container#left-sidebar-container {
    --flex-nav-expanded-size: var(--re-side-menu-width);
}
`);
    }

    if (typeof s.borderRadius === 'number' && s.borderRadius >= 0) {
        p.push(`* { border-radius: ${s.borderRadius}px !important; }`);
        if (s.borderRadius > 6) {
            p.push(`shreddit-avatar img, img.avatar, .avatar, [data-testid="comment-avatar"] img, [data-testid="profile-avatar"], .profile-avatar, img.rounded-full { border-radius: 50% !important; }`);
        }
    }

    if (s.hideFooter) {
        p.push(`reddit-sidebar-nav nav > div:has(a[href="https://redditinc.com"]),
            #right-sidebar-container > .legal-links,
            .main-container .legal-links,
            shreddit-app .legal-links,
            shreddit-app footer,
            .main-container > footer,
            faceplate-tracker[noun="footer"] { display: none !important; }`);
    }

    if (s.hideResources) p.push(`shreddit-app reddit-sidebar-nav nav nav:has(#RESOURCES), shreddit-app reddit-sidebar-nav nav nav:has(#RESOURCES) + hr { display:none !important; }`);
    if (s.hideCommunitiesSection) p.push(`shreddit-app reddit-sidebar-nav faceplate-expandable-section-helper:has(#communities_section), shreddit-app reddit-sidebar-nav faceplate-expandable-section-helper:has(#communities_section) + hr { display:none !important; }`);
    if (s.hideCustomFeedsSection) p.push(`shreddit-app reddit-sidebar-nav faceplate-expandable-section-helper:has(#multireddits_section), shreddit-app reddit-sidebar-nav faceplate-expandable-section-helper:has(#multireddits_section) + hr { display:none !important; }`);
    if (s.hideGamesLink) p.push(`shreddit-app reddit-sidebar-nav faceplate-tracker[noun="games_drawer"], shreddit-app reddit-sidebar-nav faceplate-tracker[noun="games_drawer"] + hr { display:none !important; }`);

    if (s.hideShareOnPosts) p.push(`shreddit-post-share-button { display: none !important; }`);
    if (s.hideShareOnComments) p.push(`shreddit-comment-share-button { display: none !important; }`);
    if (s.hideRepostButton) {
        p.push(`shreddit-post [slot="repost-button"], shreddit-post-repost-button, shreddit-post [slot="repost-button"] * {
            display: none !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important;
            border: 0 !important; flex: 0 0 0 !important; max-width: 0 !important; min-width: 0 !important; overflow: hidden !important;
        }`);
    }

    if (s.hideGetAppButton) p.push(`shreddit-header a[href*="reddit.app.link"], shreddit-header button[aria-label*="Get App" i], shreddit-header faceplate-tracker[noun="get_app"] { display:none !important; }`);
    if (s.hidePromotedLinks) p.push(`shreddit-ad-post, [data-testid="promoted-post"] { display:none !important; }`);
    if (s.hideRedditPremium) p.push(`#reddit-premium, .reddit-premium, faceplate-tracker[noun="premium"] { display:none !important; }`);
    if (s.hideJoinButtonOnPosts) p.push(`shreddit-post shreddit-join-button, shreddit-post [data-post-click-location="join"] { display:none !important; }`);
    if (s.hidePostBackButton) p.push(`
shreddit-post [slot="back-button"], shreddit-post [slot="post-back-button"], shreddit-post .back-button,
shreddit-post [data-post-click-location="back"], shreddit-post [icon-name="arrow-left-outline"], shreddit-post [icon-name="chevron-left"],
shreddit-app[routename="post_page"] [slot="back-button"], shreddit-app[routename="post_page"] [data-post-click-location="back"],
shreddit-app[routename="post_page"] a[aria-label="Back" i], shreddit-app[routename="post_page"] button[aria-label="Back" i],
shreddit-app[routename="post_page"] [icon-name="arrow-left-outline"], shreddit-app[routename="post_page"] [icon-name="chevron-left"]
{ display: none !important; }`);

    if (s.hideInterfaceGaps) {
        p.push(`
#main-content, main.main, shreddit-post, #right-sidebar-container aside,
[routename="post_page"] #right-sidebar-container { margin-top: 0 !important; }
#main-content, main.main { max-width: 100% !important; margin-left: 0 !important; }
shreddit-post, comment-body-header { margin-bottom: 0 !important; border-radius: 0 !important; }
shreddit-comment-tree, shreddit-feed > article > shreddit-post { border-radius: 0 !important; }
.sidebar-grid { grid-gap: 0.5rem !important; }
.gap-md { gap: 0.375rem !important; }
shreddit-comment { margin-bottom: 6px !important; }
shreddit-app[routename="subreddit"], shreddit-app[routename="subreddit"] .main-container { padding-left: 0 !important; }
shreddit-app[routename="subreddit"] .masthead { margin-left: 0 !important; margin-right: 0 !important; }
shreddit-app[routename="subreddit"] .community-banner { margin-top: 0; border-radius: 0; }
#right-sidebar-container section { margin: 0 !important; border-radius: 0 !important; }
#right-sidebar-container > aside > div, aside { border-radius: 0 !important; }
shreddit-app[routename="post_page"] .subgrid-container,
shreddit-app[routename="profile_post_page"] .subgrid-container { padding-left: 0 !important; }
shreddit-app .subgrid-container { padding: 0; }
shreddit-app[routename="frontpage"] #main-content,
shreddit-app[routename="subreddit"] #main-content,
shreddit-app[routename="post_page"] #main-content,
shreddit-app[routename="frontpage"] main.main,
shreddit-app[routename="subreddit"] main.main,
shreddit-app[routename="post_page"] main.main,
shreddit-app[routename="profile_overview"] #main-content,
shreddit-app[routename="profile_overview"] main.main { max-width: 100% !important; }
.main-container { grid-gap: 0 !important; padding: 0 !important; }
#subreddit-right-rail__partial > aside, #right-sidebar-contents > aside { margin: 0 !important; }
`);
    }

    if (s.rightSidebarMoved) {
        p.push(`@media (min-width: 1100px) {
            #right-sidebar-container, grid-sidebar {
                position: fixed !important; right: -4px !important; top: var(--mrx-sidebar-top, 56px) !important; bottom: 0 !important;
                height: auto !important; width: 324px !important; max-width: 324px !important;
                overflow-y: auto !important; z-index: 8 !important; box-sizing: border-box !important;
                background-color: var(--color-neutral-background, inherit) !important;
                border: 0 !important; border-left: 0 !important; outline: 0 !important; box-shadow: none !important;
                padding: 0 8px !important;
            }
            #right-sidebar-container > aside, #right-sidebar-container aside,
            grid-sidebar > aside, grid-sidebar aside { border-left: 0 !important; outline: 0 !important; box-shadow: none !important; }
            shreddit-app main.main, main.main { margin-right: 320px !important; }
        }`);
        p.push(`
:host(#right-sidebar-container), :host(grid-sidebar) {
    border: 0 !important; border-left: 0 !important; outline: 0 !important; box-shadow: none !important;
}
:host(#right-sidebar-container) :where(aside, section),
:host(grid-sidebar) :where(aside, section) {
    border-left: 0 !important; outline: 0 !important; box-shadow: none !important;
}
`);
    }

    if (typeof s.scaleProfileAvatar === 'number' && s.scaleProfileAvatar > 1) {
        p.push(`
/* Only scale avatars explicitly identified by the profile-page detector. Zoom participates in layout,
   unlike transform, so larger avatars reserve space instead of overlapping nearby content. */
[data-mrx-profile-avatar] {
    zoom: ${s.scaleProfileAvatar} !important;
    transform: none !important;
    transform-origin: center center !important;
    position: relative !important;
    z-index: 2 !important;
    overflow: visible !important;
}
`);
    }

    if (s.multicolouredCommentLines) {
        p.push(`
shreddit-comment[data-mrx-thread], :host(shreddit-comment[data-mrx-thread]) {
    /* Reddit's thread rail reads tone-4; leave generic border tokens alone so
       the accent doesn't bleed into cards, wrappers, and long block edges. */
    --color-tone-4: var(--mrx-thread-color) !important;
}
:host(shreddit-comment[data-mrx-thread]) :is(.threadline, [class*="threadline" i], comment-tree-line, [data-testid*="thread-line" i], [data-testid*="main-thread-line" i], [data-testid*="branch-line" i]) {
    background-color: var(--mrx-thread-color) !important;
    background-image: none !important;
    border-color: var(--mrx-thread-color) !important;
    box-shadow: none !important;
}
`);
    }

    if (s.dropShadows) p.push(`shreddit-post, shreddit-comment, #right-sidebar-container > *, reddit-sidebar-nav { box-shadow: 0 2px 10px rgba(0,0,0,0.18) !important; }`);

    if (s.fullWidthBanner) {
        p.push(`
/* The banner is sized in vw, which includes the vertical scrollbar; clip the sliver so the page gets no horizontal scrollbar. */
html { overflow-x: clip !important; }
div.community-banner,
shreddit-subreddit-header [slot="banner"],
shreddit-subreddit-header-banner,
shreddit-subreddit-header .community-banner {
    width: 100vw !important; max-width: 100vw !important;
    margin-left: calc(-50vw + 50%) !important; margin-right: calc(-50vw + 50%) !important;
    border-radius: 0 !important; padding: 0 !important; box-sizing: border-box !important;
}
div.community-banner img, div.community-banner picture,
shreddit-subreddit-header [slot="banner"] img, shreddit-subreddit-header-banner img,
shreddit-subreddit-header .community-banner img {
    width: 100% !important; height: auto !important; max-width: 100% !important; max-height: 400px !important;
    object-fit: contain !important; object-position: center !important; display: block !important;
}
.grid-container:has(div.community-banner), .subgrid-container:has(div.community-banner),
.page-container:has(div.community-banner) {
    padding-left: 0 !important; padding-right: 0 !important; max-width: 100% !important; overflow: visible !important;
}
`);
    }

    // Label removal is applyButtonLabelRule() in button-labels.js; geometry is normalised here so icons sit centred, including relocated post-option actions.
    if (s.hideButtonLabels) {
        p.push(`
[data-mrx-button-label-hidden] {
    justify-content: center !important; align-items: center !important; text-align: center !important;
    gap: 0 !important; padding-inline: 0.5rem !important; box-sizing: border-box !important;
    min-width: var(--mrx-icon-button-size, 44px) !important; width: auto !important; flex: 0 0 auto !important;
}
/* The header's Create button loses its text but would keep the width and padding made for it. */
[data-mrx-header-create] {
    width: 40px !important; min-width: 40px !important; height: 40px !important; padding: 0 !important; gap: 0 !important;
    display: inline-flex !important; justify-content: center !important; align-items: center !important;
    box-sizing: border-box !important; border-radius: 50% !important; flex: 0 0 auto !important;
}
.${POST_OPTION_CLASS} {
    display: inline-flex !important; align-items: center !important; justify-content: center !important;
}
.${POST_OPTION_CLASS} :is(div, span, faceplate-tracker, faceplate-icon) {
    display: inline-flex !important; align-items: center !important; justify-content: center !important;
    gap: 0 !important; margin: 0 !important; padding: 0 !important; width: auto !important; min-width: 0 !important;
}
.${POST_OPTION_CLASS} [data-mrx-hideButtonLabel] { display: none !important; }
/* Award buttons that still show a count keep their artwork and count, drop the
   generic award glyph, and grow to fit instead of being clipped. */
[data-mrx-award-icon-hidden] { display: none !important; }
[data-mrx-award-compact] {
    width: auto !important; min-width: var(--mrx-icon-button-size, 44px) !important; max-width: none !important;
    padding-inline: 0.75rem !important; gap: 0.3em !important; box-sizing: border-box !important;
    justify-content: center !important; align-items: center !important;
    white-space: nowrap !important; overflow: visible !important; flex: 0 0 auto !important;
}
[data-mrx-award-compact] :is(span, div) { display: inline-flex !important; align-items: center !important; gap: 0.3em !important; }
/* Hosts keep no leftover spacing from their hidden labels, so gaps between actions stay even. */
award-button, shreddit-post-share-button, shreddit-comment-share-button { width: fit-content !important; margin-inline: 0 !important; flex: 0 0 auto !important; }
.mrx-action-bar > * { margin-inline: 0 !important; }
`);
    }

    p.push(`[data-mrx-surface-fix] { background-color: transparent !important; background-image: none !important; }`);

    p.push(`div[slot="post-media-container"] [data-mrx-media-dl],
        div[slot="post-media-container"] [data-mrx-reverse-search],
        div[slot="post-media-container"] [data-mrx-forensics-btn],
        div[slot="post-media-container"] [data-mrx-crop-trigger-btn],
        div[slot="post-media-container"] [data-mrx-caliper-btn],
        div[slot="post-media-container"] [data-mrx-video-inspect-btn] { opacity: 0; transition: opacity 0.15s ease; }
        div[slot="post-media-container"]:hover [data-mrx-media-dl],
        div[slot="post-media-container"]:hover [data-mrx-reverse-search],
        div[slot="post-media-container"]:hover [data-mrx-forensics-btn],
        div[slot="post-media-container"]:hover [data-mrx-crop-trigger-btn],
        div[slot="post-media-container"]:hover [data-mrx-caliper-btn],
        div[slot="post-media-container"]:hover [data-mrx-video-inspect-btn],
        div[slot="post-media-container"] [data-mrx-media-dl]:focus-visible,
        div[slot="post-media-container"] [data-mrx-reverse-search]:focus-visible,
        div[slot="post-media-container"] [data-mrx-forensics-btn]:focus-visible,
        div[slot="post-media-container"] [data-mrx-crop-trigger-btn]:focus-visible,
        div[slot="post-media-container"] [data-mrx-caliper-btn]:focus-visible,
        div[slot="post-media-container"] [data-mrx-video-inspect-btn]:focus-visible { opacity: 1; }`);

    // Raw theme CSS stays in the document layer; shadow roots get only the theme bridge so user CSS can't restyle component internals like the media player.
    if (s.themeEnabled && s.activeThemeCSS) {
        const themeShadowCSS = buildThemeShadowCSS(s);
        if (themeShadowCSS) p.push(themeShadowCSS);
    }
    const colourVars = colourOverrideDeclarations(s);
    if (colourVars) p.push(`:host { ${colourVars} }`);

    return p.join('\n');
}
