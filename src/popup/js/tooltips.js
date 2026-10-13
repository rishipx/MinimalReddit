export function initTooltips() {
    const OPTION_TIPS = {
        masterPower: 'Enable or disable all Minimal Reddit changes.',
        hideTopBar: 'Removes Reddit’s top navigation bar.',
        nonStickyHeader: 'Lets the header scroll away with the page.',
        hideLeftSidebar: 'Hides Reddit’s left navigation column.',
        hidePopular: 'Removes Popular from the left navigation.',
        hideNews: 'Removes News from the left navigation.',
        hideExplore: 'Removes Explore from the left navigation.',
        hideStartCommunity: 'Removes the Start a Community entry.',
        hideGamesLink: 'Removes the Games entry.',
        hideCustomFeedsSection: 'Removes the custom feeds section.',
        hideRecentSection: 'Removes the Recent communities section.',
        hideCommunitiesSection: 'Removes the Communities section.',
        hideResources: 'Removes the Resources section.',
        hideVoting: 'Removes post vote controls.',
        hideComments: 'Removes post comment controls.',
        hideShareOnPosts: 'Hides Share on posts.',
        hideShareOnComments: 'Hides Share on comments.',
        hideRepostButton: 'Hides the Repost action.',
        hideRelatedCommunities: 'Hides the Suggested communities module shown when you first open a subreddit you have not joined.',
        hidePostBackButton: 'Hides the back button on post pages.',
        hideBlurredMediaBackground: 'Removes blurred media backgrounds behind images.',
        hideRecentPosts: 'Removes the Recent Posts block.',
        hideJoinButtonOnPosts: 'Hides Join buttons displayed on posts.',
        hideInterfaceGaps: 'Tightens large layout gaps between Reddit sections.',
        showPostOptions: 'Pins selected post actions into a visible action row.',
        hideButtonLabels: 'Shows post/comment actions as icons without text labels.',
        fullWidthBanner: 'Makes community banners span the available page width.',
        blockPostsByKeyword: 'Filters posts containing blocked keywords.',
        blockPostsByUser: 'Filters posts authored by blocked usernames.',
        blockPostsBySubreddit: 'Filters posts from blocked subreddits.',
        blockCommentsByKeyword: 'Filters comments containing blocked keywords.',
        blockCommentsByUser: 'Filters comments authored by blocked usernames.',
        arrowKeyNav: 'Adds keyboard navigation for posts and media.',
        communityFilterEnabled: 'Adds a quick community search field to the sidebar.',
        scrollToTop: 'Adds a floating button to return to the top.',
        collapseAutoMod: 'Collapses AutoModerator comments to reduce noise.',
        showMediaDownloadButton: 'Adds download controls to media.',
        showReverseImageSearchButton: 'Adds reverse-image search controls.',
        discordStyleLightbox: 'Uses a cleaner full-screen image viewer.',
        showImageForensicsButton: 'Adds Error Level Analysis for image inspection.',
        showCropToolButton: 'Adds a crop/export tool for images.',
        showCaliperButton: 'Adds a distance measurement tool.',
        showVideoKeyframeButton: 'Adds frame-by-frame video inspection.',
        showArchiveContextButton: 'Adds a button to try recovering removed or deleted comment text from public archives.',
        hideSearchbarLogo: 'Removes the Reddit logo from the search bar.'
    };
    Object.entries(OPTION_TIPS).forEach(([id, tip]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const row = el.closest('.toggle-row') || el;
        if (!row.title) row.title = tip;
    });
    document.querySelectorAll('.toggle-row').forEach((row) => {
        if (row.title) return;
        const control = row.querySelector('input, select');
        const label = row.querySelector(':scope > span:first-child')?.textContent?.trim();
        if (control && label) row.title = 'Enable or disable "' + label + '".';
    });
    document.querySelectorAll('select, input[type="range"], input[type="color"], input[type="file"], textarea').forEach((el) => {
        if (el.title) return;
        const label = el.previousElementSibling?.textContent?.trim();
        if (label) {
            const clean = label.replace(/:.*$/, '').trim();
            el.title = el.tagName === 'SELECT' ? 'Choose ' + clean + '.' : 'Adjust ' + clean + '.';
        }
    });
}
