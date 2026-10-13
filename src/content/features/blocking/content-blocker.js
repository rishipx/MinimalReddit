(function initBlocker(global) {
    'use strict';

    const BLOCKED_ATTR = 'data-mrx-blocked';
    // WeakMaps: entries disappear with the post/comment elements Reddit removes while scrolling.
    const postCache = new WeakMap();     // post element -> signature string
    const commentCache = new WeakMap();

    const patternCache = new Map(); // mode + raw list string -> compiled RegExp[]
    let settingsKey = '';           // invalidates per-element caches when rules change

    // User /regex/ entries run on the main thread, so they are bounded: short sources, few quantifiers, no backreferences,
    // nothing prone to exponential backtracking. Input length is capped too (see anyMatch).
    const MAX_PATTERN_LENGTH = 200;
    const MAX_QUANTIFIERS = 8;
    const MAX_REPEAT_BOUND = 100;
    const TEST_LIMITS = { name: 64, title: 400, body: 5000 };

    // Rejects shapes behind catastrophic backtracking, e.g. (a+)+, (a|a)*, (.*a){5,}. Conservative: a rejected pattern is ignored.
    function isSafeRegexSource(src) {
        if (src.length > MAX_PATTERN_LENGTH) return false;
        if (/\\(?:[1-9]|k<)/.test(src)) return false; // backreferences
        const stack = [];            // one frame per open group
        let top = { repeats: false, branches: false };
        let quantifiers = 0;
        let lastAtom = null;         // frame of the group just closed, if the last atom was a group
        for (let i = 0; i < src.length; i++) {
            const c = src[i];
            if (c === '\\') { i++; lastAtom = null; continue; }
            if (c === '[') {                                   // character class: skip to its end
                i++;
                while (i < src.length && src[i] !== ']') i += src[i] === '\\' ? 2 : 1;
                lastAtom = null;
                continue;
            }
            if (c === '(') {
                stack.push(top);
                top = { repeats: false, branches: false };
                if (src[i + 1] === '?') i += src[i + 2] === '<' && !/[=!]/.test(src[i + 3] || '') ? src.indexOf('>', i) - i : 2;
                lastAtom = null;
                continue;
            }
            if (c === ')') {
                const closed = top;
                top = stack.pop() || { repeats: false, branches: false };
                top.repeats = top.repeats || closed.repeats;     // nesting inherits inner risk
                top.branches = top.branches || closed.branches;
                lastAtom = closed;
                continue;
            }
            if (c === '|') { top.branches = true; lastAtom = null; continue; }
            let quantified = false;
            if (c === '*' || c === '+') quantified = true;
            else if (c === '?') { quantifiers++; lastAtom = null; continue; } // lazy/optional: cheap
            else if (c === '{') {
                const m = /^\{(\d+)(?:,(\d*))?\}/.exec(src.slice(i));
                if (m) {
                    const upper = m[2] === undefined ? +m[1] : (m[2] === '' ? Infinity : +m[2]);
                    if (upper > MAX_REPEAT_BOUND) return false;
                    quantified = upper > 1;
                    i += m[0].length - 1;
                }
            }
            if (quantified) {
                quantifiers++;
                if (lastAtom && (lastAtom.repeats || lastAtom.branches)) return false;
                top.repeats = true;
            }
            lastAtom = null;
        }
        return quantifiers <= MAX_QUANTIFIERS;
    }

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // mode 'substring' (keywords): plain text matches anywhere.
    // mode 'exact' (usernames, subreddits): plain text must match the whole name, and a
    // leading u/ or r/ is ignored. Entries written as /regex/ behave the same in both modes.
    function compilePatterns(list, mode) {
        const m = mode === 'exact' ? 'exact' : 'substring';
        const key = m + '\u0000' + (list || '');
        let hit = patternCache.get(key);
        if (!hit) {
            hit = compilePatternsUncached(list || '', m);
            if (patternCache.size > 50) patternCache.clear();
            patternCache.set(key, hit);
        }
        return hit;
    }

    function compilePatternsUncached(list, mode) {
        return list
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .map((raw) => {
                const m = /^\/(.+)\/([gimsuy]*)$/.exec(raw);
                if (m) {
                    if (!isSafeRegexSource(m[1])) return null;
                    try { const fl = m[2].replace(/[gy]/g, ''); return new RegExp(m[1], fl.includes('i') ? fl : fl + 'i'); }
                    catch (e) { return null; }
                }
                if (raw.length > MAX_PATTERN_LENGTH) return null;
                if (mode === 'exact') {
                    const name = raw.replace(/^\/?[ur]\//i, '');
                    return name ? new RegExp('^' + escapeRegExp(name) + '$', 'i') : null;
                }
                return new RegExp(escapeRegExp(raw), 'i');
            })
            .filter(Boolean);
    }

    function anyMatch(patterns, text, limit) {
        const t = text.length > limit ? text.slice(0, limit) : text;
        for (const re of patterns) if (re.test(t)) return true;
        return false;
    }

    function hide(el) {
        if (el.hasAttribute(BLOCKED_ATTR)) return;
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute(BLOCKED_ATTR, '1');
    }

    function restore(el) {
        if (!el.hasAttribute(BLOCKED_ATTR)) return;
        el.style.removeProperty('display');
        el.removeAttribute(BLOCKED_ATTR);
    }

    function scanPost(post, settings) {
        const title = post.getAttribute('post-title') ||
            (post.querySelector('h1, h2, [slot="title"]') || {}).textContent || '';
        const author = post.getAttribute('author') || '';
        const subreddit = post.getAttribute('subreddit') || '';
        const url = post.getAttribute('content-href') || post.getAttribute('permalink') || '';
        const sig = `${settingsKey}|${title}|${author}|${subreddit}|${url}`;
        if (postCache.get(post) === sig) return;
        postCache.set(post, sig);

        let block = false;
        if (settings.blockPostsByKeyword) {
            const pats = compilePatterns(settings.blockedPostKeywords);
            if (anyMatch(pats, title, TEST_LIMITS.title)) block = true;
        }
        if (!block && settings.blockPostsByUser && author) {
            if (anyMatch(compilePatterns(settings.blockedPostUsers, 'exact'), author, TEST_LIMITS.name)) block = true;
        }
        if (!block && settings.blockPostsBySubreddit && subreddit) {
            if (anyMatch(compilePatterns(settings.blockedSubreddits, 'exact'), subreddit, TEST_LIMITS.name)) block = true;
        }
        if (block) hide(post); else restore(post);
    }

    function scanComment(comment, settings) {
        const body = comment.querySelector('[slot="comment"], .md');
        const text = body ? body.textContent : '';
        const author = comment.getAttribute('author') || '';
        const sig = `${settingsKey}|${text.slice(0, 200)}|${author}`;
        if (commentCache.get(comment) === sig) return;
        commentCache.set(comment, sig);

        let block = false;
        if (settings.blockCommentsByKeyword && text) {
            if (anyMatch(compilePatterns(settings.blockedCommentKeywords), text, TEST_LIMITS.body)) block = true;
        }
        if (!block && settings.blockCommentsByUser && author) {
            if (anyMatch(compilePatterns(settings.blockedCommentUsers, 'exact'), author, TEST_LIMITS.name)) block = true;
        }
        if (block) hide(comment); else restore(comment);
    }

    function scan(root, settings) {
        if (typeof root.querySelectorAll !== 'function') return;
        if (!settings.masterPower) return;
        const anyBlocking = settings.blockPostsByKeyword || settings.blockPostsByUser ||
            settings.blockPostsBySubreddit || settings.blockCommentsByKeyword ||
            settings.blockCommentsByUser;
        if (!anyBlocking) {
            root.querySelectorAll(`[${BLOCKED_ATTR}]`).forEach(restore);
            return;
        }

        settingsKey = [
            settings.blockPostsByKeyword && settings.blockedPostKeywords,
            settings.blockPostsByUser && settings.blockedPostUsers,
            settings.blockPostsBySubreddit && settings.blockedSubreddits,
            settings.blockCommentsByKeyword && settings.blockedCommentKeywords,
            settings.blockCommentsByUser && settings.blockedCommentUsers
        ].join('\u0001');

        root.querySelectorAll('shreddit-post').forEach((p) => scanPost(p, settings));
        root.querySelectorAll('shreddit-comment').forEach((c) => scanComment(c, settings));
    }

    global.MRXBlocker = { scan, compilePatterns, isSafeRegexSource };
})(window);
