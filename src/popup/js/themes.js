import { browserAPI } from './browser-api.js';

import { persistSettings } from './settings-store.js';

export function initThemes() {
    const THEME_DEFAULTS = { activeThemePreset: 0, themeEnabled: false, activeThemeCSS: '' };
    const PRESET_THEMES = MRX_THEME_PRESETS;
    const presetThemeSelectEl = document.getElementById('presetThemeSelect');
    const presetThemeDescriptionEl = document.getElementById('presetThemeDescription');
    const themeStatusEl = document.getElementById('themeStatus');
    let activeThemePreset = 0;
    function showThemeStatus(msg) {
        themeStatusEl.textContent = msg;
        if (msg) setTimeout(() => { if (themeStatusEl.textContent === msg) themeStatusEl.textContent = ''; }, 2500);
    }
    PRESET_THEMES.slice(1).forEach((preset, offset) => {
        const opt = document.createElement('option');
        opt.value = String(offset + 1);
        opt.textContent = preset.name;
        presetThemeSelectEl.appendChild(opt);
    });
    function updatePresetDescription() {
        const preset = PRESET_THEMES[parseInt(presetThemeSelectEl.value, 10)] || PRESET_THEMES[0];
        presetThemeDescriptionEl.textContent = preset.description;
    }
    function resolvePresetIndex(state) {
        if (Number.isInteger(state.activeThemePreset) && state.activeThemePreset >= 0 && state.activeThemePreset < PRESET_THEMES.length) return state.activeThemePreset;
        if (!state.themeEnabled || !state.activeThemeCSS) return 0;
        const css = String(state.activeThemeCSS).trim();
        const found = PRESET_THEMES.findIndex((preset, i) => i > 0 && preset.css.trim() === css);
        return found > 0 ? found : 0;
    }
    function applyThemePreset(showStatus = true) {
        const index = Math.max(0, Math.min(PRESET_THEMES.length - 1, parseInt(presetThemeSelectEl.value, 10) || 0));
        const preset = PRESET_THEMES[index] || PRESET_THEMES[0];
        activeThemePreset = index;
        presetThemeSelectEl.value = String(index);
        persistSettings({
            activeThemePreset: index,
            themeEnabled: index !== 0,
            activeThemeCSS: preset.css
        });
        updatePresetDescription();
        if (showStatus) showThemeStatus(index === 0 ? 'Default applied.' : 'Applied.');
    }
    updatePresetDescription();
    presetThemeSelectEl.addEventListener('change', updatePresetDescription);
    document.getElementById('applyThemeBtn').addEventListener('click', () => applyThemePreset(true));
    browserAPI.storage.local.get(THEME_DEFAULTS, (state) => {
        activeThemePreset = resolvePresetIndex(state);
        const cleanup = {};
        if (activeThemePreset !== state.activeThemePreset) cleanup.activeThemePreset = activeThemePreset;
        const selectedPreset = PRESET_THEMES[activeThemePreset] || PRESET_THEMES[0];
        if (!Number.isInteger(state.activeThemePreset)) {
            cleanup.themeEnabled = activeThemePreset !== 0;
            cleanup.activeThemeCSS = selectedPreset.css;
        } else if (state.themeEnabled && activeThemePreset > 0 && String(state.activeThemeCSS || '').trim() !== String(selectedPreset.css).trim()) {
            // Keep active preset tokens in sync after an extension upgrade.
            cleanup.activeThemeCSS = selectedPreset.css;
        }
        if (Object.keys(cleanup).length) browserAPI.storage.local.set(cleanup);
        presetThemeSelectEl.value = String(activeThemePreset);
        updatePresetDescription();
    });
}
