(function initArchive(global) {
    'use strict';

    const browserAPI = typeof chrome !== 'undefined' && chrome.runtime ? chrome : browser;

    const BUTTON_MARKER = 'data-mrx-archive-btn';
    const CALLOUT_CLASS = 'mrx-archive-callout';
    const RESULT_CACHE_LIMIT = 200;
    const resultCache = new Map();

    function isRemovedOrDeleted(commentEl) {
        if (commentEl.hasAttribute('is-comment-deleted')) return true;
        if (commentEl.getAttribute('deleted') === 'true' || commentEl.getAttribute('removed') === 'true') return true;

        // The removed/deleted placeholder has moved between light DOM and open shadow roots; check both,
        // but never credit a nested reply's [removed] to its parent comment.
        const scopes = [commentEl];
        if (commentEl.shadowRoot) scopes.push(commentEl.shadowRoot);
        const seenScopes = new Set();
        const placeholder = /^\[(removed|deleted)(\s+by\s+reddit)?\]$/i;
        const candidateSelector = 'p, span, div, h1, h2, h3, h4, h5, h6';
        while (scopes.length) {
            const scope = scopes.pop();
            if (!scope || seenScopes.has(scope) || typeof scope.querySelectorAll !== 'function') continue;
            seenScopes.add(scope);
            const ownerComment = scope.host && scope.host.tagName === 'SHREDDIT-COMMENT' ? scope.host : commentEl;

            for (const el of scope.querySelectorAll(candidateSelector)) {
                const closestComment = el.closest('shreddit-comment');
                if (closestComment && closestComment !== ownerComment) continue;
                if (el.children.length === 0 && placeholder.test((el.textContent || '').trim())) return true;
            }

            for (const el of scope.querySelectorAll('*')) {
                const closestComment = el.closest('shreddit-comment');
                if (closestComment && closestComment !== ownerComment) continue;
                if (el.shadowRoot) scopes.push(el.shadowRoot);
            }
        }
        return false;
    }

    function getCommentId(commentEl) {
        const raw = commentEl.getAttribute('thingid')
            || commentEl.getAttribute('comment-id')
            || commentEl.getAttribute('id')
            || '';
        if (raw) return raw.replace(/^t1_/i, '');
        const permalink = commentEl.getAttribute('permalink') || '';
        const match = /\/comments\/[a-z0-9]+\/[^/]*\/([a-z0-9]+)\/?(?:\?|$)/i.exec(permalink);
        return match ? match[1] : '';
    }

    function formatTimestamp(createdUtc) {
        if (!createdUtc) return '';
        try { return new Date(createdUtc * 1000).toLocaleString(); }
        catch { return ''; }
    }

    function renderCallout(anchor, state) {
        const existing = anchor.nextElementSibling;
        if (existing && existing.classList && existing.classList.contains(CALLOUT_CLASS)) existing.remove();

        const box = document.createElement('div');
        box.className = CALLOUT_CLASS;

        if (state.loading) {
            box.classList.add('mrx-archive-loading');
            box.textContent = 'Checking public archives…';
        } else if (state.ok) {
            const meta = document.createElement('div');
            meta.className = 'mrx-archive-meta';
            const authorPart = state.author ? `u/${state.author}` : '[unknown author]';
            const timePart = formatTimestamp(state.createdUtc);
            meta.textContent = `Recovered from ${state.source}${timePart ? ` · ${timePart}` : ''} · ${authorPart}`;
            const body = document.createElement('div');
            body.className = 'mrx-archive-body';
            body.textContent = state.body;
            box.appendChild(meta);
            box.appendChild(body);
        } else {
            box.classList.add('mrx-archive-error');
            const messages = {
                rate_limited: 'The archive service is rate-limiting requests right now. Try again in a moment.',
                timeout: 'The archive lookup timed out. The service may be slow or unreachable right now.',
                not_found: "This comment wasn't found in the public archive.",
                network_error: 'Could not reach the archive service.'
            };
            box.textContent = messages[state.code] || 'Could not recover this comment from the archive.';
        }

        anchor.insertAdjacentElement('afterend', box);
        return box;
    }

    function makeButton(commentEl) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute(BUTTON_MARKER, '1');
        btn.className = 'mrx-archive-btn';
        btn.textContent = 'Recover comment text';
        btn.title = 'Try public archives for a saved copy of this removed or deleted comment';

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const id = getCommentId(commentEl);
            if (!id) { renderCallout(btn, { ok: false, code: 'not_found' }); return; }

            if (resultCache.has(id)) {
                renderCallout(btn, resultCache.get(id));
                btn.textContent = 'Refresh recovered text';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Checking archives…';
            renderCallout(btn, { loading: true });

            let result;
            try {
                result = await browserAPI.runtime.sendMessage({ action: 'mrxFetchArchive', commentId: id });
            } catch (err) {
                result = { ok: false, code: 'network_error' };
            }
            if (!result) result = { ok: false, code: 'network_error' };

            // Cache hits only. Not-found can be temporary (archives ingest late), so retry must actually retry.
            if (result.ok) {
                if (resultCache.size >= RESULT_CACHE_LIMIT) resultCache.delete(resultCache.keys().next().value);
                resultCache.set(id, result);
            }
            renderCallout(btn, result);
            btn.disabled = false;
            btn.textContent = result.ok ? 'Refresh recovered text' : 'Try archives again';
        });

        return btn;
    }

    function attachButtons(root, settings) {
        if (typeof root.querySelectorAll !== 'function') return;

        if (!settings.showArchiveContextButton) {
            root.querySelectorAll(`[${BUTTON_MARKER}]`).forEach((btn) => {
                const callout = btn.nextElementSibling;
                if (callout && callout.classList.contains(CALLOUT_CLASS)) callout.remove();
                btn.remove();
            });
            return;
        }

        root.querySelectorAll('shreddit-comment').forEach((commentEl) => {
            if (commentEl.querySelector(`[${BUTTON_MARKER}]`)) return;
            if (!isRemovedOrDeleted(commentEl)) return;

            const bodyEl = commentEl.querySelector('[slot="comment"], .md, [data-testid="comment"]');
            if (bodyEl) {
                bodyEl.insertAdjacentElement('afterend', makeButton(commentEl));
            } else {
                commentEl.appendChild(makeButton(commentEl));
            }
        });
    }

    global.MRXArchive = { attachButtons };
})(window);
