function applyResizeVars(s) {
    const root = document.documentElement;
    if (!root) return;
    const style = root.style;

    let contentWidth;
    if (s.contentWidthMode === 'mega') contentWidth = '97%';
    else if (s.contentWidthMode === 'custom') contentWidth = s.contentWidth + '%';
    else contentWidth = '';
    if (contentWidth) {
        if (style.getPropertyValue('--re-content-width') !== contentWidth) style.setProperty('--re-content-width', contentWidth);
    } else {
        style.removeProperty('--re-content-width');
    }

    // Mega pins post pages to 93%; Custom uses the slider; Default leaves Reddit's own width alone.
    const postWidth = s.contentWidthMode === 'mega' ? '93%'
        : s.contentWidthMode === 'custom' ? (s.postWidth || 100) + '%' : '';
    if (postWidth) {
        if (style.getPropertyValue('--re-post-width') !== postWidth) style.setProperty('--re-post-width', postWidth);
    } else {
        style.removeProperty('--re-post-width');
    }

    if (typeof s.sideMenuWidth === 'number' && s.sideMenuWidth > 0) {
        style.setProperty('--re-side-menu-width', s.sideMenuWidth + 'px');
    } else {
        style.removeProperty('--re-side-menu-width');
    }
}
