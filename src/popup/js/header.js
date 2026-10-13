import { browserAPI } from './browser-api.js';

export function initHeader() {
    const versionEl = document.getElementById('mrxVersion');
    if (versionEl && browserAPI.runtime.getManifest) versionEl.textContent = 'v' + browserAPI.runtime.getManifest().version;

    // Diagnostics for bug reports: asks the active Reddit tab for its debug report.
    const debugBtn = document.getElementById('copyDebugInfo');
    if (debugBtn) {
        const label = debugBtn.textContent;
        const flash = (text) => { debugBtn.textContent = text; setTimeout(() => { debugBtn.textContent = label; }, 2000); };
        debugBtn.addEventListener('click', async () => {
            try {
                const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
                const res = tab && await browserAPI.tabs.sendMessage(tab.id, { action: 'mrxDebugInfo' });
                if (!res || !res.ok) { flash('Open a Reddit tab first'); return; }
                await navigator.clipboard.writeText(JSON.stringify(res.info, null, 2));
                flash('Copied');
            } catch (e) { flash('Open a Reddit tab first'); }
        });
    }
}
