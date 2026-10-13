const COMMUNITY_FILTER_MARKER = 'data-mrx-community-filter-injected';
function getCommunitiesShadowRoot(section) {
    return section.querySelector('left-nav-communities-controller')?.shadowRoot || null;
}
function filterCommunityList(section, query) {
    const shadow = getCommunitiesShadowRoot(section);
    if (!shadow) return;
    const q = normalizeText(query);
    shadow.querySelectorAll('left-nav-community-item').forEach((item) => {
        const prefixed = item.getAttribute('prefixedname') || '';
        const name = prefixed.startsWith('r/') ? prefixed.slice(2) : prefixed;
        item.style.display = (!q || normalizeText(name).includes(q)) ? '' : 'none';
    });
}
function applyCommunityFilter(root, settings) {
    const section = document.querySelector('#communities_section');
    if (!section) return;
    if (!settings.communityFilterEnabled) {
        const box = section.querySelector(`[${COMMUNITY_FILTER_MARKER}]`);
        if (box) box.remove();
        filterCommunityList(section, '');
        return;
    }
    if (section.querySelector(`[${COMMUNITY_FILTER_MARKER}]`)) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search communities…';
    input.setAttribute(COMMUNITY_FILTER_MARKER, '1');
    input.style.cssText = 'box-sizing:border-box;width:calc(100% - 32px);margin:4px 16px 8px 16px;padding:6px 8px;font-size:12px;border-radius:6px;border:1px solid rgba(128,128,128,0.4);background:transparent;color:inherit;';
    input.addEventListener('input', () => filterCommunityList(section, input.value));
    const controller = section.querySelector('left-nav-communities-controller');
    section.insertBefore(input, controller || null);
}
