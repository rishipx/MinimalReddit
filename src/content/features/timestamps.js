const ABSOLUTE_TS_CLASS = 'mrx-absolute-ts';
const TIMESTAMP_FORMAT_TOKENS = ['dddd', 'ddd', 'MMMM', 'MMM', 'yyyy', 'hh', 'mm', 'ss', 'AP', 'ap', 'yy', 'MM', 'dd', 'M', 'd', 'h', 'm', 's'];
const TIMESTAMP_TOKEN_PATTERN = new RegExp(TIMESTAMP_FORMAT_TOKENS.join('|'), 'g');
function formatTimestampDefault(date) {
    return date.toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatTimestampCustom(date, fmt) {
    const use12h = /AP/i.test(fmt);
    const h24 = date.getHours();
    const h = use12h ? (h24 % 12 || 12) : h24;
    const tokens = {
        dddd: date.toLocaleDateString(undefined, { weekday: 'long' }), ddd: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dd: String(date.getDate()).padStart(2, '0'), d: String(date.getDate()),
        MMMM: date.toLocaleDateString(undefined, { month: 'long' }), MMM: date.toLocaleDateString(undefined, { month: 'short' }),
        MM: String(date.getMonth() + 1).padStart(2, '0'), M: String(date.getMonth() + 1),
        yyyy: String(date.getFullYear()), yy: String(date.getFullYear()).slice(-2),
        hh: String(h).padStart(2, '0'), h: String(h),
        mm: String(date.getMinutes()).padStart(2, '0'), m: String(date.getMinutes()),
        ss: String(date.getSeconds()).padStart(2, '0'), s: String(date.getSeconds()),
        AP: h24 >= 12 ? 'PM' : 'AM', ap: h24 >= 12 ? 'pm' : 'am'
    };
    return fmt.replace(TIMESTAMP_TOKEN_PATTERN, (m) => (m in tokens ? tokens[m] : m));
}
function formatAbsoluteTimestamp(date, fmt) {
    if (fmt) { try { return formatTimestampCustom(date, fmt); } catch (e) { /* ignore */ } }
    return formatTimestampDefault(date);
}
function parseTimestampAttr(raw) {
    if (!raw) return null;
    const ms = /^\d+$/.test(raw) ? parseInt(raw, 10) : Date.parse(raw);
    return Number.isNaN(ms) ? null : new Date(ms);
}
function hideTimeElement(time) {
    time.style.setProperty('display', 'none', 'important');
    time.setAttribute('data-mrx-ts-hidden', '1');
}
function clearAbsoluteTimestamps(root, selector = `.${ABSOLUTE_TS_CLASS}`) {
    root.querySelectorAll(selector).forEach((el) => {
        const parent = el.parentElement;
        if (parent) parent.querySelectorAll('time[data-mrx-ts-hidden]').forEach((t) => { t.style.removeProperty('display'); t.removeAttribute('data-mrx-ts-hidden'); });
        el.remove();
    });
}
function applyAbsoluteTimestamps(root, settings) {
    if (!settings.absoluteTimestampsPosts) clearAbsoluteTimestamps(root, `faceplate-timeago .${ABSOLUTE_TS_CLASS}`);
    if (!settings.absoluteTimestampsComments) clearAbsoluteTimestamps(root, `a.${ABSOLUTE_TS_CLASS}`);
    if (settings.absoluteTimestampsPosts) {
        root.querySelectorAll('faceplate-timeago').forEach((host) => {
            if (!host.closest('shreddit-post')) return;
            if (host.querySelector(`.${ABSOLUTE_TS_CLASS}`)) return;
            const raw = host.getAttribute('ts') || host.querySelector('time')?.getAttribute('datetime');
            const date = parseTimestampAttr(raw);
            if (!date) return;
            const span = document.createElement('span');
            span.className = ABSOLUTE_TS_CLASS;
            span.style.cssText = 'font-size:inherit;color:inherit;';
            span.textContent = ' (' + formatAbsoluteTimestamp(date, settings.absoluteTimestampFormat) + ')';
            host.appendChild(span);
            const innerTime = host.querySelector('time');
            if (innerTime) hideTimeElement(innerTime);
        });
    }
    if (settings.absoluteTimestampsComments) {
        root.querySelectorAll('a:has(time)').forEach((anchor) => {
            if (!anchor.closest('shreddit-comment')) return;
            if (anchor.nextElementSibling && anchor.nextElementSibling.classList?.contains(ABSOLUTE_TS_CLASS)) return;
            const timeEl = anchor.querySelector('time');
            const date = parseTimestampAttr(timeEl?.getAttribute('datetime'));
            if (!date) return;
            const replacement = document.createElement('a');
            replacement.className = ABSOLUTE_TS_CLASS;
            replacement.href = anchor.getAttribute('href') || '';
            replacement.style.cssText = 'font-size:12px !important;opacity:0.65 !important;color:inherit !important;text-decoration:none !important;';
            replacement.textContent = formatAbsoluteTimestamp(date, settings.absoluteTimestampFormat);
            anchor.insertAdjacentElement('afterend', replacement);
            hideTimeElement(timeEl);
        });
    }
}
