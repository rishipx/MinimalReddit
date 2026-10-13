import { browserAPI } from './browser-api.js';

import { persistSettings } from './settings-store.js';
import { paintRanges } from './range-fill.js';

export function initCustomize() {
    const CUSTOMIZE_DEFAULTS = {
        borderRadius: -1, fontSelection: 'inter', customFontName: '', customFontData: '',
        bgColor: '', bgImageData: '', bgBlur: 0,
        gradientFrom: '#1a1a2e', gradientTo: '#16213e',
        themePrimaryColor: '#ff4500', themeSecondaryColor: '#0079d3', themeBackgroundColor: '#1a1a1b',
        contentWidthMode: 'default', contentWidth: 100, postWidth: 100, sideMenuWidth: 0,
        resizePostContent: 0, resizeComments: 0,
        postContentWeight: '', commentWeight: '', scaleProfileAvatar: 1,
        absoluteTimestampFormat: ''
    };
    const cz = {
        radiusEnabled: document.getElementById('radiusEnabled'),
        radiusValue: document.getElementById('radiusValue'),
        radiusValueLabel: document.getElementById('radiusValueLabel'),
        fontSelect: document.getElementById('fontSelect'),
        customFontUploadRow: document.getElementById('customFontUploadRow'),
        customFontFile: document.getElementById('customFontFile'),
        customFontStatus: document.getElementById('customFontStatus'),
        bgColorEnabled: document.getElementById('bgColorEnabled'),
        bgColor: document.getElementById('bgColor'),
        bgImageFile: document.getElementById('bgImageFile'),
        bgImageStatus: document.getElementById('bgImageStatus'),
        clearBgImageBtn: document.getElementById('clearBgImageBtn'),
        bgBlur: document.getElementById('bgBlur'),
        bgBlurValueLabel: document.getElementById('bgBlurValueLabel'),
        contentWidthMode: document.getElementById('contentWidthMode'),
        contentWidthRow: document.getElementById('contentWidthRow'),
        contentWidthValue: document.getElementById('contentWidthValue'),
        contentWidthValueLabel: document.getElementById('contentWidthValueLabel'),
        postWidthValue: document.getElementById('postWidthValue'),
        postWidthValueLabel: document.getElementById('postWidthValueLabel'),
        sideMenuWidthEnabled: document.getElementById('sideMenuWidthEnabled'),
        sideMenuWidthValue: document.getElementById('sideMenuWidthValue'),
        sideMenuWidthValueLabel: document.getElementById('sideMenuWidthValueLabel'),
        gradientFrom: document.getElementById('gradientFrom'),
        gradientTo: document.getElementById('gradientTo'),
        themePrimaryColor: document.getElementById('themePrimaryColor'),
        themeSecondaryColor: document.getElementById('themeSecondaryColor'),
        themeBackgroundColor: document.getElementById('themeBackgroundColor'),
        clearThemeBgBtn: document.getElementById('clearThemeBgBtn'),
        resizePostContent: document.getElementById('resizePostContent'),
        resizePostContentLabel: document.getElementById('resizePostContentLabel'),
        resizeComments: document.getElementById('resizeComments'),
        resizeCommentsLabel: document.getElementById('resizeCommentsLabel'),
        postContentWeight: document.getElementById('postContentWeight'),
        commentWeight: document.getElementById('commentWeight'),
        scaleProfileAvatar: document.getElementById('scaleProfileAvatar'),
        scaleProfileAvatarLabel: document.getElementById('scaleProfileAvatarLabel'),
        timestampFormatPreset: document.getElementById('timestampFormatPreset'),
        timestampFormatCustom: document.getElementById('timestampFormatCustom')
    };
    let customFontName = '', customFontData = '', bgImageData = '';
    function updateCustomFontRowVisibility() { cz.customFontUploadRow.style.display = cz.fontSelect.value === 'custom' ? 'block' : 'none'; }
    function updateContentWidthRowVisibility() {
        const mode = cz.contentWidthMode.value;
        cz.contentWidthRow.style.display = mode === 'custom' ? 'block' : 'none';
        document.getElementById('postWidthRow').style.display = mode === 'custom' ? 'block' : 'none';
        document.getElementById('megaWidthNote').style.display = mode === 'mega' ? 'block' : 'none';
    }
    function updateTimestampFormatVisibility() {
        if (!cz.timestampFormatPreset || !cz.timestampFormatCustom) return;
        const custom = cz.timestampFormatPreset.value === '__custom__';
        cz.timestampFormatCustom.style.display = custom ? 'block' : 'none';
    }
    // Font/background payloads can be megabytes, so they're only written when they change.
    function collectCustomizeSettings(withMedia) {
        const media = withMedia ? { customFontName, customFontData, bgImageData, hasBgImage: !!bgImageData } : {};
        return {
            ...media,
            borderRadius: cz.radiusEnabled.checked ? parseInt(cz.radiusValue.value, 10) : -1,
            fontSelection: cz.fontSelect.value,
            bgColor: cz.bgColorEnabled.checked ? cz.bgColor.value : '',
            bgBlur: parseInt(cz.bgBlur.value, 10) || 0,
            gradientFrom: cz.gradientFrom.value,
            gradientTo: cz.gradientTo.value,
            themePrimaryColor: cz.themePrimaryColor.value,
            themeSecondaryColor: cz.themeSecondaryColor.value,
            themeBackgroundColor: cz.themeBackgroundColor.value,
            contentWidthMode: cz.contentWidthMode.value,
            contentWidth: parseInt(cz.contentWidthValue.value, 10) || 100,
            postWidth: parseInt(cz.postWidthValue.value, 10) || 100,
            sideMenuWidth: cz.sideMenuWidthEnabled.checked ? parseInt(cz.sideMenuWidthValue.value, 10) : 0,
            resizePostContent: parseInt(cz.resizePostContent.value, 10) || 0,
            resizeComments: parseInt(cz.resizeComments.value, 10) || 0,
            postContentWeight: cz.postContentWeight.value,
            commentWeight: cz.commentWeight.value,
            scaleProfileAvatar: parseInt(cz.scaleProfileAvatar.value, 10) || 1,
            absoluteTimestampFormat: cz.timestampFormatPreset.value === '__custom__'
                ? (cz.timestampFormatCustom.value || '')
                : (cz.timestampFormatPreset.value || '')
        };
    }
    const persistAndSyncCustomize = (withMedia) => persistSettings(collectCustomizeSettings(withMedia === true));
    browserAPI.storage.local.get(CUSTOMIZE_DEFAULTS, (settings) => {
        cz.radiusEnabled.checked = settings.borderRadius >= 0;
        cz.radiusValue.value = settings.borderRadius >= 0 ? settings.borderRadius : 0;
        cz.radiusValueLabel.textContent = cz.radiusValue.value + 'px';
        cz.fontSelect.value = settings.fontSelection === 'inter' ? '' : (settings.fontSelection || '');
        customFontName = settings.customFontName || '';
        customFontData = settings.customFontData || '';
        if (customFontName) cz.customFontStatus.textContent = 'Loaded: ' + customFontName;
        updateCustomFontRowVisibility();
        cz.bgColorEnabled.checked = !!settings.bgColor;
        if (settings.bgColor) cz.bgColor.value = settings.bgColor;
        bgImageData = settings.bgImageData || '';
        cz.bgImageStatus.textContent = bgImageData ? 'Image loaded.' : 'No image chosen.';
        cz.bgBlur.value = settings.bgBlur;
        cz.bgBlurValueLabel.textContent = settings.bgBlur + 'px';
        cz.gradientFrom.value = settings.gradientFrom;
        cz.gradientTo.value = settings.gradientTo;
        cz.themePrimaryColor.value = settings.themePrimaryColor;
        cz.themeSecondaryColor.value = settings.themeSecondaryColor;
        cz.themeBackgroundColor.value = settings.themeBackgroundColor;
        cz.contentWidthMode.value = settings.contentWidthMode || 'default';
        cz.contentWidthValue.value = settings.contentWidth;
        cz.contentWidthValueLabel.textContent = settings.contentWidth + '%';
        cz.postWidthValue.value = settings.postWidth || 100;
        cz.postWidthValueLabel.textContent = (settings.postWidth || 100) + '%';
        cz.sideMenuWidthEnabled.checked = (settings.sideMenuWidth || 0) > 0;
        cz.sideMenuWidthValue.value = settings.sideMenuWidth > 0 ? settings.sideMenuWidth : 280;
        cz.sideMenuWidthValueLabel.textContent = cz.sideMenuWidthValue.value + 'px';
        updateContentWidthRowVisibility();
        cz.resizePostContent.value = settings.resizePostContent;
        cz.resizePostContentLabel.textContent = settings.resizePostContent ? settings.resizePostContent + 'px' : 'default';
        cz.resizeComments.value = settings.resizeComments;
        cz.resizeCommentsLabel.textContent = settings.resizeComments ? settings.resizeComments + 'px' : 'default';
        cz.postContentWeight.value = settings.postContentWeight || '';
        cz.commentWeight.value = settings.commentWeight || '';
        cz.scaleProfileAvatar.value = settings.scaleProfileAvatar;
        cz.scaleProfileAvatarLabel.textContent = settings.scaleProfileAvatar + '×';
        const fmt = settings.absoluteTimestampFormat || '';
        const presets = Array.from(cz.timestampFormatPreset.options).map((o) => o.value);
        if (presets.includes(fmt) && fmt !== '__custom__') {
            cz.timestampFormatPreset.value = fmt;
            cz.timestampFormatCustom.value = '';
        } else if (fmt) {
            cz.timestampFormatPreset.value = '__custom__';
            cz.timestampFormatCustom.value = fmt;
        } else {
            cz.timestampFormatPreset.value = '';
            cz.timestampFormatCustom.value = '';
        }
        updateTimestampFormatVisibility();
        paintRanges();
    });
    cz.radiusValue.addEventListener('input', () => { cz.radiusValueLabel.textContent = cz.radiusValue.value + 'px'; persistAndSyncCustomize(); });
    cz.bgBlur.addEventListener('input', () => { cz.bgBlurValueLabel.textContent = cz.bgBlur.value + 'px'; persistAndSyncCustomize(); });
    cz.contentWidthValue.addEventListener('input', () => { cz.contentWidthValueLabel.textContent = cz.contentWidthValue.value + '%'; persistAndSyncCustomize(); });
    cz.postWidthValue.addEventListener('input', () => { cz.postWidthValueLabel.textContent = cz.postWidthValue.value + '%'; persistAndSyncCustomize(); });
    cz.sideMenuWidthValue.addEventListener('input', () => { cz.sideMenuWidthValueLabel.textContent = cz.sideMenuWidthValue.value + 'px'; persistAndSyncCustomize(); });
    cz.resizePostContent.addEventListener('input', () => { cz.resizePostContentLabel.textContent = cz.resizePostContent.value == 0 ? 'default' : cz.resizePostContent.value + 'px'; persistAndSyncCustomize(); });
    cz.resizeComments.addEventListener('input', () => { cz.resizeCommentsLabel.textContent = cz.resizeComments.value == 0 ? 'default' : cz.resizeComments.value + 'px'; persistAndSyncCustomize(); });
    cz.scaleProfileAvatar.addEventListener('input', () => { cz.scaleProfileAvatarLabel.textContent = cz.scaleProfileAvatar.value + '×'; persistAndSyncCustomize(); });
    cz.contentWidthMode.addEventListener('change', () => { updateContentWidthRowVisibility(); persistAndSyncCustomize(); });
    cz.fontSelect.addEventListener('change', () => { updateCustomFontRowVisibility(); persistAndSyncCustomize(); });
    cz.timestampFormatPreset.addEventListener('change', () => {
        updateTimestampFormatVisibility();
        if (cz.timestampFormatPreset.value === '__custom__') cz.timestampFormatCustom.focus();
        persistAndSyncCustomize();
    });
    cz.timestampFormatCustom.addEventListener('input', persistAndSyncCustomize);
    cz.sideMenuWidthEnabled.addEventListener('change', persistAndSyncCustomize);
    cz.customFontFile.addEventListener('change', () => {
        const file = cz.customFontFile.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { cz.customFontStatus.textContent = 'File too large (max 5MB).'; cz.customFontFile.value = ''; return; }
        const reader = new FileReader();
        reader.onload = () => {
            customFontData = reader.result;
            customFontName = (file.name.replace(/\.[^.]+$/, '') || 'CustomFont').replace(/[^a-zA-Z0-9 _-]/g, '') || 'CustomFont';
            cz.customFontStatus.textContent = 'Loaded: ' + customFontName;
            cz.fontSelect.value = 'custom';
            updateCustomFontRowVisibility();
            persistAndSyncCustomize(true);
        };
        reader.readAsDataURL(file);
    });
    cz.bgImageFile.addEventListener('change', () => {
        const file = cz.bgImageFile.files[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) { cz.bgImageStatus.textContent = 'Image too large (max 8MB).'; cz.bgImageFile.value = ''; return; }
        const reader = new FileReader();
        reader.onload = () => { bgImageData = reader.result; cz.bgImageStatus.textContent = 'Loaded: ' + file.name; persistAndSyncCustomize(true); };
        reader.readAsDataURL(file);
    });
    cz.clearBgImageBtn.addEventListener('click', () => {
        bgImageData = ''; cz.bgImageFile.value = ''; cz.bgImageStatus.textContent = 'No image chosen.'; persistAndSyncCustomize(true);
    });
    cz.clearThemeBgBtn.addEventListener('click', () => { cz.themeBackgroundColor.value = '#1a1a1b'; persistAndSyncCustomize(); });
    [cz.radiusEnabled, cz.bgColorEnabled, cz.bgColor,
     cz.gradientFrom, cz.gradientTo, cz.themePrimaryColor, cz.themeSecondaryColor, cz.themeBackgroundColor,
     cz.postContentWeight, cz.commentWeight].forEach((el) => {
        el.addEventListener('change', persistAndSyncCustomize);
    });
}
