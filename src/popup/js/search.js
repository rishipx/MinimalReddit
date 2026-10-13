export function initSearch() {
    const searchInput = document.getElementById('settingsSearchInput');
    const searchWrap = document.getElementById('settingsSearch');
    const searchResults = document.getElementById('settingsSearchResults');
    const searchClearBtn = document.getElementById('searchClear');

    function normalizeSearchText(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function levenshtein(a, b) {
        const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
        for (let j = 1; j <= a.length; j++) {
            const curr = [j];
            for (let i = 1; i <= b.length; i++) {
                curr[i] = Math.min(curr[i - 1] + 1, prev[i] + 1, prev[i - 1] + (a[j - 1] === b[i - 1] ? 0 : 1));
            }
            for (let i = 0; i < curr.length; i++) prev[i] = curr[i];
        }
        return prev[b.length];
    }

    function fuzzyScore(query, candidate) {
        const q = normalizeSearchText(query);
        const text = normalizeSearchText(candidate);
        if (!q || !text) return -Infinity;
        if (text === q) return 1200;
        if (text.includes(q)) return 1000 - Math.min(200, text.length - q.length);
        const qTokens = q.split(' ').filter(Boolean);
        const cTokens = text.split(' ').filter(Boolean);
        let score = 0, matched = 0;
        for (const qt of qTokens) {
            let best = -Infinity;
            for (const ct of cTokens) {
                if (ct === qt) best = Math.max(best, 320);
                else if (ct.startsWith(qt)) best = Math.max(best, 240 - Math.min(80, ct.length - qt.length));
                else {
                    const distance = levenshtein(qt, ct);
                    const maxDistance = qt.length <= 4 ? 1 : 2;
                    if (distance <= maxDistance) best = Math.max(best, 180 - distance * 55);
                    else {
                        let qi = 0;
                        for (const ch of ct) { if (ch === qt[qi]) qi++; if (qi === qt.length) break; }
                        if (qi === qt.length) best = Math.max(best, 135);
                    }
                }
            }
            if (best > -Infinity) { score += best; matched++; }
        }
        if (!matched) return -Infinity;
        if (matched === qTokens.length) score += 180;
        else score -= (qTokens.length - matched) * 90;
        return score;
    }

    function getSearchTargetLabel(el) {
        if (el.classList.contains('toggle-row')) return el.querySelector(':scope > span:first-child')?.textContent?.trim() || '';
        if (el.classList.contains('field-label')) return el.textContent.replace(/:.*$/, '').trim();
        return el.textContent.trim();
    }

    // Appends `label` to `parent`, wrapping the first case-insensitive match of `query` in <mark>.
    function appendHighlighted(parent, label, query) {
        const q = String(query || '').trim();
        const idx = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1;
        if (idx < 0) { parent.append(label); return; }
        const mark = document.createElement('mark');
        mark.textContent = label.slice(idx, idx + q.length);
        parent.append(label.slice(0, idx), mark, label.slice(idx + q.length));
    }

    function collectSearchItems() {
        const items = [];
        document.querySelectorAll('.tab-panel').forEach(panel => {
            const tab = panel.id.replace('tab-', '');
            panel.querySelectorAll('.toggle-row, .field-label').forEach(target => {
                if (target.closest('.section-header')) return;
                const label = getSearchTargetLabel(target);
                if (!label) return;
                const section = target.closest('.section-group');
                items.push({ target, label, tab, section, score: 0 });
            });
        });
        return items;
    }

    const allSearchItems = collectSearchItems();

    function closeSearchResults() {
        searchResults.classList.remove('open');
        searchResults.replaceChildren();
    }

    function flashElement(el) {
        if (!el) return;
        el.classList.remove('mrx-flash');
        void el.offsetWidth; // restart the animation when the same setting is picked twice
        el.classList.add('mrx-flash');
        const cleanup = () => el.classList.remove('mrx-flash');
        el.addEventListener('animationend', cleanup, { once: true });
        // animationend is not fired when the browser or OS reduces motion.
        window.setTimeout(cleanup, 2100);
    }

    function openSearchResult(item) {
        searchInput.blur();
        closeSearchResults();
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${item.tab}"]`);
        if (tabBtn && !tabBtn.classList.contains('active')) tabBtn.click();
        if (item.section?.classList.contains('collapsed')) item.section.classList.remove('collapsed');
        // Give tab/section transitions a frame to expose the target; otherwise the flash plays while the row is still clipped.
        window.setTimeout(() => {
            item.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            requestAnimationFrame(() => flashElement(item.target));
        }, 100);
    }

    function runSearch(query) {
        const q = String(query || '').trim();
        searchResults.replaceChildren();
        if (!q) { closeSearchResults(); return; }

        const ranked = allSearchItems
            .map(item => ({ ...item, score: fuzzyScore(q, item.label) }))
            .filter(item => item.score > -Infinity)
            .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
            .slice(0, 10);

        searchResults.classList.add('open');
        if (!ranked.length) {
            const empty = document.createElement('div');
            empty.className = 'search-empty';
            empty.textContent = 'No matching settings';
            searchResults.appendChild(empty);
            return;
        }
        ranked.forEach(item => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'search-result';
            button.setAttribute('role', 'option');
            const icon = document.createElement('span');
            icon.className = 'result-icon';
            icon.dataset.icon = 'sliders-horizontal';
            icon.dataset.iconSize = '14';
            const label = document.createElement('span');
            label.className = 'result-label';
            appendHighlighted(label, item.label, q);
            const tab = document.createElement('span');
            tab.className = 'result-tab';
            tab.textContent = item.tab[0].toUpperCase() + item.tab.slice(1);
            button.append(icon, label, tab);
            button.addEventListener('click', () => openSearchResult(item));
            searchResults.appendChild(button);
        });
        if (window.MRXIcons) MRXIcons.hydrate(searchResults);
    }

    searchInput.addEventListener('input', () => {
        searchWrap.classList.toggle('has-value', !!searchInput.value);
        runSearch(searchInput.value);
    });
    searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) runSearch(searchInput.value); });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { searchInput.value = ''; searchWrap.classList.remove('has-value'); closeSearchResults(); }
    });
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchWrap.classList.remove('has-value');
        closeSearchResults();
        searchInput.focus();
    });
    document.addEventListener('click', (e) => {
        if (!searchWrap.contains(e.target)) closeSearchResults();
    });
}
