const RIGHT_SIDEBAR_MARKER = 'data-mrx-hideRightSidebar';

function applyRightSidebarRule(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const shouldHide = settings.masterPower && settings.hideRightSidebar;
    if (!shouldHide) {
        const restored = root.querySelectorAll(`[${RIGHT_SIDEBAR_MARKER}]`);
        if (restored.length) restored.forEach((el) => { el.style.removeProperty('display'); el.removeAttribute(RIGHT_SIDEBAR_MARKER); });
        return;
    }
    root.querySelectorAll(RIGHT_SIDEBAR_HOST).forEach((host) => {
        Array.from(host.children).forEach((child) => {
            if (child.matches && child.matches(RECENT_WIDGET_SELECTOR)) return;
            if (child.querySelector && child.querySelector(RECENT_WIDGET_SELECTOR)) return;
            const candidates = child.querySelectorAll('h2, h3, h4, span, div');
            for (const h of candidates) {
                const t = (h.textContent || '').trim();
                if (t.length > 0 && t.length <= 30 && /^recent(\s+posts)?$/i.test(t)) return;
            }
            if (child.matches && child.matches('shreddit-subreddit-rules, shreddit-community-highlights, faceplate-expandable-section-helper, shreddit-related-communities')) return;
            if (child.querySelector && child.querySelector('#RULES, #MODERATORS, #SIDEBAR_APPS, #RELATED_COMMUNITIES, shreddit-subreddit-rules, shreddit-community-highlights, shreddit-related-communities')) return;
            if (child.hasAttribute(RIGHT_SIDEBAR_MARKER)) return;
            child.style.setProperty('display', 'none', 'important');
            child.setAttribute(RIGHT_SIDEBAR_MARKER, '1');
        });
    });
}

// The "suggested communities" module Reddit shows when you first open a subreddit you have not joined.
const SUGGESTED_COMMUNITIES_SELECTOR = 'shreddit-related-communities, shreddit-suggested-communities, community-recommendations, [data-testid*="suggested-communit" i], [data-testid*="community-recommend" i], faceplate-loader[name*="Suggested" i], faceplate-loader[name*="RelatedCommunit" i]';
const SUGGESTED_COMMUNITIES_TEXT = /^(suggested|similar|related)\s+(communities|subreddits)$|^communities\s+you\s+might\s+(like|enjoy)$/i;

const SECTION_RULES = [
    { flag: 'hideSidebarRules', containerSelector: 'shreddit-subreddit-rules', headingSelector: '#RULES', test: (text) => /^(r\/[a-z0-9_]+\s+)?rules$/i.test(text) || /^moderator\s+rules$/i.test(text) || /^subreddit\s+rules$/i.test(text) },
    { flag: 'hideSidebarModerators', headingSelector: '#MODERATORS', test: (text) => /^moderators?$/i.test(text) },
    { flag: 'hideSidebarInstalledApps', headingSelector: '#SIDEBAR_APPS', test: (text) => /^(installed\s+)?apps$/i.test(text) },
    { flag: 'hideSidebarRelatedCommunities', headingSelector: '#RELATED_COMMUNITIES', test: (text) => /^related\s+(communities|subreddits)$/i.test(text) },
    { flag: 'hideCommunityHighlights', containerSelector: 'shreddit-community-highlights', test: (text) => /^community\s+highlights$/i.test(text) },
    { flag: 'hideRelatedCommunities', containerSelector: SUGGESTED_COMMUNITIES_SELECTOR, test: (text) => SUGGESTED_COMMUNITIES_TEXT.test(text) }
];

function hideSectionAndDivider(section, marker) {
    if (!section || section.hasAttribute(marker)) return;
    section.style.setProperty('display', 'none', 'important');
    section.setAttribute(marker, '1');
    const next = section.nextElementSibling;
    if (next && next.tagName === 'HR') {
        next.style.setProperty('display', 'none', 'important');
        next.setAttribute(marker, '1');
    }
}

// Finds a section from its heading: climbs to the first ancestor with several children, capped at a few levels
// so a wrong guess never hides something large.
function findSectionContainer(el, extraSelector) {
    if (extraSelector) {
        const viaSelector = el.closest(extraSelector);
        if (viaSelector) return viaSelector;
    }
    let node = el;
    for (let i = 0; i < 5 && node && node.parentElement; i++) {
        node = node.parentElement;
        if (node.children && node.children.length > 1) return node;
    }
    return el.parentElement || el;
}

function applySectionRules(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const enabled = [], disabled = [];
    for (const rule of SECTION_RULES) {
        if (settings.masterPower && settings[rule.flag]) enabled.push(rule);
        else disabled.push(rule);
    }
    for (const rule of disabled) {
        const marker = `data-mrx-${rule.flag}`;
        const els = root.querySelectorAll(`[${marker}]`);
        if (els.length) els.forEach((el) => { el.style.removeProperty('display'); el.removeAttribute(marker); });
    }
    if (!enabled.length) return;

    for (const rule of enabled) {
        const marker = `data-mrx-${rule.flag}`;
        if (rule.containerSelector) {
            const found = root.querySelectorAll(rule.containerSelector);
            if (found.length) found.forEach((s) => hideSectionAndDivider(s, marker));
        }
        if (rule.headingSelector) {
            const found = root.querySelectorAll(rule.headingSelector);
            if (found.length) found.forEach((h) => {
                const s = findSectionContainer(h, 'faceplate-expandable-section-helper, section, details');
                hideSectionAndDivider(s, marker);
            });
        }
    }

    const candidates = root.querySelectorAll('h2, h3, h4, h5, span, div');
    if (!candidates.length) return;
    candidates.forEach((el) => {
        const text = (el.textContent || '').trim();
        if (text.length === 0 || text.length > 40) return;
        for (const rule of enabled) {
            if (!rule.test(text)) continue;
            const s = findSectionContainer(el, 'faceplate-expandable-section-helper, section, details');
            hideSectionAndDivider(s, `data-mrx-${rule.flag}`);
            return;
        }
    });
}

function applyRecentSections(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const recentOn = settings.masterPower && settings.hideRecentSection;
    const recentPostsOn = settings.masterPower && settings.hideRecentPosts;
    const markers = '[data-mrx-hideRecentSection], [data-mrx-hideRecentPosts]';

    if (!recentOn && !recentPostsOn) {
        const stale = root.querySelectorAll(markers);
        if (stale.length) stale.forEach((el) => {
            el.style.removeProperty('display');
            el.removeAttribute('data-mrx-hideRecentSection');
            el.removeAttribute('data-mrx-hideRecentPosts');
        });
        return;
    }

    const hideAll = (selector, attr) => {
        if (!root.querySelectorAll) return;
        root.querySelectorAll(selector).forEach((el) => {
            if (el.hasAttribute(attr)) return;
            el.style.setProperty('display', 'none', 'important');
            el.setAttribute(attr, '1');
        });
    };

    if (recentOn) {
        hideAll('left-nav-recent-communities, #recent-communities-section, faceplate-loader[name*="RecentCommunities" i]', 'data-mrx-hideRecentSection');
    }
    if (recentPostsOn) {
        hideAll('shreddit-recent-posts, faceplate-loader[name*="RecentPosts" i], recent-posts, [data-testid="recent-posts"], [data-testid*="recent-posts-container" i], [id="recent-posts"], [class~="recent-posts"]', 'data-mrx-hideRecentPosts');
    }

    const headingSelector = 'h1, h2, h3, h4, h5, h6, button, span, p, div';
    root.querySelectorAll(headingSelector).forEach((el) => {
        const text = normalizeText(el.textContent || '');
        if (!text || text.length > 40) return;

        if (recentOn && text === 'recent' && !el.hasAttribute('data-mrx-hideRecentSection')) {
            const c = findSectionContainer(el, 'faceplate-expandable-section-helper, section, details');
            if (c && !c.hasAttribute('data-mrx-hideRecentSection')) {
                c.style.setProperty('display', 'none', 'important');
                c.setAttribute('data-mrx-hideRecentSection', '1');
            }
        }

        if (recentPostsOn && text === 'recent posts' && !el.hasAttribute('data-mrx-hideRecentPosts')) {
            const explicit = el.closest('section, details, faceplate-expandable-section-helper, recent-posts, shreddit-recent-posts, [data-testid*="recent-posts-container" i], [id="recent-posts"], [class~="recent-posts"]');
            const c = explicit || findSectionContainer(el, 'faceplate-expandable-section-helper, section, details');
            if (c && !c.hasAttribute('data-mrx-hideRecentPosts')) {
                c.style.setProperty('display', 'none', 'important');
                c.setAttribute('data-mrx-hideRecentPosts', '1');
            }
        }
    });
}
