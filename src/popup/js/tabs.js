import { browserAPI } from './browser-api.js';

export function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const LAST_TAB_KEY = 'mrxLastTab';


    function activateTab(tabName, persist = true) {
        const btn = Array.from(tabButtons).find((b) => b.dataset.tab === tabName) || tabButtons[0];
        if (!btn) return;
        tabButtons.forEach((b) => b.classList.remove('active'));
        tabPanels.forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById('tab-' + btn.dataset.tab);
        if (panel) {
            panel.classList.add('active');
            panel.classList.remove('tab-fade');
            void panel.offsetWidth;
            panel.classList.add('tab-fade');
        }
        document.getElementById('popup-scroll').scrollTop = 0;
        if (persist && browserAPI.storage?.local) browserAPI.storage.local.set({ [LAST_TAB_KEY]: btn.dataset.tab });
        return btn;
    }

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => activateTab(btn.dataset.tab, true));
    });

    browserAPI.storage.local.get({ [LAST_TAB_KEY]: 'tools' }, (saved) => {
        activateTab(saved[LAST_TAB_KEY] || 'tools', false);
    });
}
