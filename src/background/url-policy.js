// Must stay within manifest host_permissions (reddit.com, redd.it).
const FETCH_HOST_ALLOW = /^(?:[a-z0-9-]+\.)*(?:redd\.it|reddit\.com)$/i;
export function isAllowedMediaUrl(raw) {
    try {
        const u = new URL(raw);
        return u.protocol === 'https:' && FETCH_HOST_ALLOW.test(u.hostname);
    } catch { return false; }
}

export function sanitizeDownloadFilename(value) {
    const fallback = 'reddit-media';
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    const safe = raw
        .replace(/[\\/]+/g, '-')
        .replace(/\.\.(?=\.)/g, '.')
        .replace(/[<>:"|?*\x00-\x1f]/g, '-')
        .replace(/^\.+/, '')
        .trim();
    return safe || fallback;
}

const TRACKING_PARAM = /^(?:utm_.*|ref|ref_src|context|igshid|fbclid)$/i;
export function cleanLink(raw) {
    try {
        const u = new URL(raw);
        for (const key of Array.from(u.searchParams.keys())) {
            if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
        }
        return u.toString();
    } catch (e) { return String(raw || ''); }
}
