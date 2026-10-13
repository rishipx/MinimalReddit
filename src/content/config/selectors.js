// All selectors tied to Reddit's markup live here, so a redesign is a one-file fix. Loaded before the files that use them.

const PROTECTED_SELECTOR = [
    'a[href*="/chat"]', '[aria-label*="Chat" i]',
    'a[href*="/notifications"]', '[aria-label*="Notification" i]',
    'a[href*="/submit"]', '[aria-label*="Create Post" i]', '[aria-label="Create"]'
].join(', ');
const HEADER_CREATE_HOST_SELECTOR = [
    'shreddit-header', 'reddit-header-large', 'reddit-header',
    '[data-testid*="header" i]', 'header'
].join(', ');
const FOLLOW_BTN_SELECTOR = '#post-overflow-follow, #post-overflow-replyNotifs';
const ACTION_BUTTON_HOST_SELECTOR = [
    'shreddit-post button', 'shreddit-post a',
    'shreddit-comment button', 'shreddit-comment a',
    'shreddit-post-comment-button', 'shreddit-comment-tree-button',
    'shreddit-post-share-button', 'shreddit-comment-share-button',
    'shreddit-post-repost-button', 'shreddit-comment-reply-button',
    'shreddit-post-save-button', 'shreddit-comment-save-button',
    'award-button',
    '#post-overflow-save', '#post-overflow-hide', '#post-overflow-report',
    '#post-overflow-award', '#post-overflow-follow', '#post-overflow-replyNotifs'
].join(', ');
const AWARD_SELECTOR = 'award-button, #post-overflow-award, [id*="award" i], [aria-label*="award" i]';
const COMMENT_BTN_SELECTOR = [
    'shreddit-comment-tree-button', 'shreddit-post-comment-button',
    '[data-post-click-location="comments-button"]', 'shreddit-post [data-testid="comments-button"]',
    'button[aria-label*="comment" i]', 'a[aria-label*="comment" i]'
].join(', ');
const VOTE_UP_SELECTOR = 'button[upvote], [aria-label*="upvote" i], [icon-name="upvote-outline"], [icon-name="upvote-fill"]';
const VOTE_DOWN_SELECTOR = 'button[downvote], [aria-label*="downvote" i], [icon-name="downvote-outline"], [icon-name="downvote-fill"]';
const VOTE_PILL_UP = 'button[upvote], [aria-label*="upvote" i]';
const VOTE_PILL_DOWN = 'button[downvote], [aria-label*="downvote" i]';
const VOTE_PILL_OTHER_ACTIONS = 'shreddit-post-share-button, shreddit-post-comment-button, shreddit-post-repost-button, [slot="comment-button"], [slot="share-button"], [slot="repost-button"], a';
const RECENT_WIDGET_SELECTOR = 'reddit-recent-pages, faceplate-loader[name*="Recent" i], left-nav-recent-communities, #recent-communities-section, shreddit-recent-posts, recent-posts, [data-testid="recent-posts"], [data-testid*="recent-posts-container" i], [id="recent-posts"], [class~="recent-posts"]';
const RIGHT_SIDEBAR_HOST = '#right-sidebar-container, grid-sidebar';
const FAVORITE_STAR_SELECTOR = 'button[aria-label*="favorite" i], button[aria-label*="favourite" i], button[aria-label*="add to favorites" i], button[aria-label*="remove from favorites" i], [icon-name="star-outline"], [icon-name="star-fill"], [icon-name="star"], [data-testid="favorite-button"]';
const GALLERY_PREV_SELECTOR = 'button[aria-label*="revious" i], button[aria-label*="rior" i], button[icon-name="caret-left-outline"], button[icon-name="caret-left"]';
const GALLERY_NEXT_SELECTOR = 'button[aria-label*="next" i], button[icon-name="caret-right-outline"], button[icon-name="caret-right"]';
const SURFACE_SKIP_ANCESTORS = '[data-mrx], #mrx-scroll-top, shreddit-player, shreddit-player-2, gallery-carousel, media-controller, [role="dialog"], [role="tooltip"], dialog, faceplate-modal';
const SURFACE_SKIP_HOSTS = /^(SHREDDIT-PLAYER|SHREDDIT-PLAYER-2|GALLERY-CAROUSEL|MEDIA-CONTROLLER|MEDIA-THEME|FACEPLATE-MODAL)$/;

/* Selector groups reported by the "Copy debug info" popup action. */
const MRX_DEBUG_SELECTORS = {
    followButton: FOLLOW_BTN_SELECTOR,
    actionButtonHosts: ACTION_BUTTON_HOST_SELECTOR,
    award: AWARD_SELECTOR,
    commentButton: COMMENT_BTN_SELECTOR,
    voteUp: VOTE_UP_SELECTOR,
    voteDown: VOTE_DOWN_SELECTOR,
    recentWidgets: RECENT_WIDGET_SELECTOR,
    rightSidebar: RIGHT_SIDEBAR_HOST,
    favoriteStar: FAVORITE_STAR_SELECTOR,
    galleryPrev: GALLERY_PREV_SELECTOR,
    galleryNext: GALLERY_NEXT_SELECTOR
};
