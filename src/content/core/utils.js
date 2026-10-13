function normalizeText(s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function ownText(el) { return normalizeText(el.getAttribute('aria-label') || el.textContent || ''); }

function isSafeToHide(el) {
    if (el.querySelector && el.querySelector(PROTECTED_SELECTOR)) return false;
    const text = (el.textContent || '').trim();
    if (text.length > 60) return false;
    return true;
}

// Inline because these buttons are injected into Reddit's shadow roots as well as the page.
const MRX_OVERLAY_BTN_CSS = 'position:absolute;top:8px;z-index:6;width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,0.65);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;';

const hasModifier = (e) => e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;

// Synthetic hover wakes Reddit's lazy media components so their controls exist before use.
function nudgeHover(el) {
    if (!el) return;
    const opts = { bubbles: true, cancelable: true, composed: true, view: window };
    for (const type of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter']) {
        try {
            const Ctor = type.startsWith('pointer') && typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
            el.dispatchEvent(new Ctor(type, opts));
        } catch (e) { /* native media component may reject synthetic events */ }
    }
}

function debounce(fn, ms, maxWait) {
    let t = null, maxTimer = null;
    return (...args) => {
        if (t === null) fn(...args);
        clearTimeout(t);
        t = setTimeout(() => {
            t = null;
            clearTimeout(maxTimer);
            maxTimer = null;
            fn(...args);
        }, ms);
        if (maxWait && maxTimer === null) {
            maxTimer = setTimeout(() => {
                maxTimer = null;
                clearTimeout(t);
                t = null;
                fn(...args);
            }, maxWait);
        }
    };
}
