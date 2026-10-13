import { initHeader } from './header.js';
import { initRangeFill } from './range-fill.js';
import { initTabs } from './tabs.js';
import { initSections } from './sections.js';
import { initReloadBanner } from './settings-store.js';
import { initToggles } from './toggles.js';
import { initCustomize } from './customize.js';
import { initThemes } from './themes.js';
import { initSearch } from './search.js';
import { initTooltips } from './tooltips.js';

// Icons referenced from markup through data-icon attributes.
if (window.MRXIcons) MRXIcons.hydrate(document);

initHeader();
initRangeFill();
initTabs();
initSections();
initReloadBanner();
initToggles();
initCustomize();
initThemes();
initSearch();
initTooltips();
