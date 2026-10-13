export function initSections() {
    const COLLAPSED_STORAGE_KEY = 'mrxCollapsedSections';
    const DEFAULT_COLLAPSED_SECTIONS = new Set([
        'misc', 'filter', 'style-fonts', 'style-resize', 'style-radius', 'style-colours', 'style-background', 'style-themes'
    ]);
    let collapsedSet = new Set(DEFAULT_COLLAPSED_SECTIONS);

    try {
        const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
        if (stored) {
            const arr = JSON.parse(stored);
            if (Array.isArray(arr)) collapsedSet = new Set(arr);
        }
    } catch (e) { /* ignore */ }

    function persistCollapsed() {
        try { localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(Array.from(collapsedSet))); }
        catch (e) { /* ignore */ }
    }

    document.querySelectorAll('.section-group').forEach((group) => {
        const sectionId = group.dataset.sectionId;
        const collapseBtn = group.querySelector('.section-collapse-btn');
        if (!collapseBtn) return;

        group.classList.toggle('collapsed', collapsedSet.has(sectionId));

        collapseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            group.classList.toggle('collapsed');
            if (group.classList.contains('collapsed')) collapsedSet.add(sectionId);
            else collapsedSet.delete(sectionId);
            persistCollapsed();
        });
    });
}
