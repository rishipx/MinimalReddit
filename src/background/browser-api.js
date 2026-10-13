export const browserAPI = typeof chrome !== 'undefined' && chrome.runtime ? chrome : browser;
