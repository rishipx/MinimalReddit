const THREAD_COLOURS = ['#3D8AB4', '#813AB4', '#789B36', '#DF8A35', '#C7433C', '#C73D7B', '#51DBA6'];
const THREAD_MARKER = 'data-mrx-thread';

function applyMulticolouredCommentLines(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const enabled = settings.masterPower && settings.multicolouredCommentLines;
    if (!enabled) {
        const marked = root.querySelectorAll(`[${THREAD_MARKER}]`);
        if (marked.length) marked.forEach((c) => {
            c.style.removeProperty('--mrx-thread-color');
            c.removeAttribute(THREAD_MARKER);
        });
        return;
    }
    const unprocessed = root.querySelectorAll(`shreddit-comment:not([${THREAD_MARKER}])`);
    if (!unprocessed.length) return;
    unprocessed.forEach((comment) => {
        let depth = parseInt(comment.getAttribute('depth'), 10);
        if (!(depth >= 0)) {
            depth = 0;
            for (let p = comment.parentElement; p && p.tagName !== 'SHREDDIT-COMMENT-TREE'; p = p.parentElement) {
                if (p.tagName === 'SHREDDIT-COMMENT') depth++;
            }
        }
        comment.style.setProperty('--mrx-thread-color', THREAD_COLOURS[depth % THREAD_COLOURS.length]);
        comment.setAttribute(THREAD_MARKER, '1');
    });
}
