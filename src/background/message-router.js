import { browserAPI } from './browser-api.js';
import { injectUtil } from './script-injector.js';
import { isAllowedMediaUrl, sanitizeDownloadFilename } from './url-policy.js';
import { lookupArchivedComment } from './archive-lookup.js';
import { pickWorkingMediaUrl } from './video-probe.js';

export function registerMessageRouter() {
    browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || !message.action) return;
        switch (message.action) {
            case 'mrxInjectUtil':
                injectUtil(message.name, sender).then(sendResponse);
                return true;
            case 'mrxDownload': {
                if (!isAllowedMediaUrl(message.url)) { sendResponse({ ok: false }); return false; }
                const filename = sanitizeDownloadFilename(message.filename);
                browserAPI.downloads.download({ url: message.url, filename, saveAs: false })
                    .then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
                return true;
            }
            case 'mrxResolveVideo':
                pickWorkingMediaUrl(message.candidates).then((url) => sendResponse(url ? { ok: true, url } : { ok: false }), () => sendResponse({ ok: false }));
                return true;
            case 'mrxFetchArchive':
                lookupArchivedComment(message.commentId).then(sendResponse);
                return true;
            default:
                return false;
        }
    });
}
