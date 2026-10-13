import { browserAPI } from './browser-api.js';
import { cleanLink } from './url-policy.js';

export function registerContextMenus() {
    browserAPI.runtime.onInstalled.addListener(() => {
        browserAPI.contextMenus.removeAll(() => {
            browserAPI.contextMenus.create({
                id: 'mrx-copy-clean-link',
                title: 'Copy clean link',
                contexts: ['link'],
                targetUrlPatterns: ['*://*.reddit.com/*']
            });
            browserAPI.contextMenus.create({
                id: 'mrx-analyze-image',
                title: 'Analyze image (ELA)',
                contexts: ['image'],
                documentUrlPatterns: ['*://*.reddit.com/*']
            });
            browserAPI.contextMenus.create({
                id: 'mrx-download-media',
                title: 'Download media',
                contexts: ['image', 'video'],
                documentUrlPatterns: ['*://*.reddit.com/*']
            });
        });
    });

    browserAPI.contextMenus.onClicked.addListener((info, tab) => {
        if (!tab || !tab.id) return;
        const send = (message) => browserAPI.tabs.sendMessage(tab.id, message).catch(() => {});
        if (info.menuItemId === 'mrx-copy-clean-link' && info.linkUrl) {
            send({ action: 'mrxCopyToClipboard', text: cleanLink(info.linkUrl) });
        } else if (info.menuItemId === 'mrx-analyze-image' && info.srcUrl) {
            send({ action: 'mrxAnalyzeImageContext', url: info.srcUrl });
        } else if (info.menuItemId === 'mrx-download-media' && info.srcUrl) {
            send({ action: 'mrxDownloadMediaContext', url: info.srcUrl });
        }
    });
}
