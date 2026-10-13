const LABEL_RULES = [
    { flag: 'hidePopular', labels: ['popular'], selectors: ['a[href="/r/popular/"]', 'a[href^="/r/popular"]'] },
    { flag: 'hideNews', labels: ['news'], selectors: ['a[href="/r/news/"]', 'a[href^="/r/news"]'] },
    { flag: 'hideExplore', labels: ['explore'], selectors: ['a[href^="/explore"]'] },
    { flag: 'hideStartCommunity', labelKeywords: [['start', 'communit'], ['create', 'communit']], selectors: ['a[href*="/subreddits/create"]', 'a[href*="/r/create"]'] },
    { flag: 'hideCreateFeed', labelKeywords: [['create', 'feed'], ['new', 'feed']], selectors: ['a[href*="/f/create"]', 'a[href*="/custom-feed/create"]'] }
];

function applyLabelRules(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const enabled = [], disabled = [];
    for (const rule of LABEL_RULES) {
        if (settings.masterPower && settings[rule.flag]) enabled.push(rule);
        else disabled.push(rule);
    }
    for (const rule of disabled) {
        const marker = `data-mrx-${rule.flag}`;
        const els = root.querySelectorAll(`[${marker}]`);
        if (els.length) els.forEach((el) => { el.style.removeProperty('display'); el.removeAttribute(marker); });
    }
    if (!enabled.length) return;

    const selectorToRule = new Map();
    for (const rule of enabled) for (const sel of rule.selectors) selectorToRule.set(sel, rule);
    const combinedSelector = Array.from(selectorToRule.keys()).join(', ');
    if (combinedSelector) {
        root.querySelectorAll(combinedSelector).forEach((el) => {
            for (const [sel, rule] of selectorToRule) {
                if (!el.matches(sel)) continue;
                if (!isSafeToHide(el)) return;
                const marker = `data-mrx-${rule.flag}`;
                if (el.hasAttribute(marker)) return;
                el.style.setProperty('display', 'none', 'important');
                el.setAttribute(marker, '1');
                return;
            }
        });
    }

    root.querySelectorAll('a, button, [role="button"]').forEach((el) => {
        // The text test rejects nearly everything, so isSafeToHide() only runs once a rule matches.
        const text = ownText(el);
        if (!text) return;
        for (const rule of enabled) {
            const phraseHit = rule.labels && rule.labels.some((l) => text === l.toLowerCase());
            const keywordHit = rule.labelKeywords && rule.labelKeywords.some((words) => words.every((w) => text.includes(w.toLowerCase())));
            if (!phraseHit && !keywordHit) continue;
            if (!isSafeToHide(el)) return;
            const marker = `data-mrx-${rule.flag}`;
            let target = el;
            const li = el.closest('li');
            if (li && li !== el) {
                const others = li.querySelectorAll('a, button, [role="button"]');
                const isShared = Array.from(others).some((o) => o !== el && !el.contains(o) && !o.contains(el));
                if (!isShared) target = li;
            }
            if (!isSafeToHide(target)) return;
            if (target.hasAttribute(marker)) return;
            target.style.setProperty('display', 'none', 'important');
            target.setAttribute(marker, '1');
            return;
        }
    });
}
