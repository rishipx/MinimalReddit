const MEDIA_COMPAT_MARKER = 'data-mrx-media-compat';

function repairRedditVideo(video) {
    if (!video || video.nodeType !== Node.ELEMENT_NODE) return;

    // Safety overrides only; no autoplay, seeking, muting or other playback changes.
    const safeStyles = {
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        filter: 'none',
        'mix-blend-mode': 'normal',
        background: 'transparent',
        'max-width': '100%'
    };
    for (const [property, value] of Object.entries(safeStyles)) {
        if (video.style.getPropertyValue(property) !== value) {
            video.style.setProperty(property, value, 'important');
        }
    }

    if (!video.hasAttribute(MEDIA_COMPAT_MARKER)) video.setAttribute(MEDIA_COMPAT_MARKER, '1');
}

function repairRedditMedia(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;

    // Once per host. Reddit can replace the <video> inside a player, so the nested root gets a fresh, unmarked video.
    root.querySelectorAll(`shreddit-player:not([${MEDIA_COMPAT_MARKER}]), shreddit-player-2:not([${MEDIA_COMPAT_MARKER}])`).forEach((player) => {
        player.setAttribute(MEDIA_COMPAT_MARKER, '1');
        nudgeHover(player);
    });

    root.querySelectorAll(`video:not([${MEDIA_COMPAT_MARKER}])`).forEach(repairRedditVideo);
}
