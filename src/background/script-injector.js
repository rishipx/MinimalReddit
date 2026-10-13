import { browserAPI } from './browser-api.js';

const UTIL_FILES = {
    forensics: ['src/content/on-demand/forensics.js'],
    crop: ['src/content/on-demand/crop.js'],
    caliper: ['src/content/on-demand/caliper.js']
};
export async function injectUtil(name, sender) {
    const files = UTIL_FILES[name];
    if (!files || !sender.tab || sender.tab.id == null) return { ok: false };
    try {
        await browserAPI.scripting.executeScript({
            target: { tabId: sender.tab.id, frameIds: [sender.frameId || 0] },
            files
        });
        return { ok: true };
    } catch (err) {
        return { ok: false, error: (err && err.message) || 'inject failed' };
    }
}
