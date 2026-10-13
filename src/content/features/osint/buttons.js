const FORENSICS_BTN_MARKER = 'data-mrx-forensics-btn';
const CROP_BTN_MARKER = 'data-mrx-crop-trigger-btn';
const CALIPER_BTN_MARKER = 'data-mrx-caliper-btn';
const VIDEO_INSPECT_BTN_MARKER = 'data-mrx-video-inspect-btn';

function makeToolButton({ marker, title, label, icon, onClick }, rightOffset) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute(marker, '1');
    btn.title = title;
    btn.setAttribute('aria-label', label);
    btn.style.cssText = `${MRX_OVERLAY_BTN_CSS}right:${rightOffset};${icon ? '' : 'font-size:14px;'}`;
    if (icon) btn.replaceChildren(MRXIcons.el(icon, { size: 15 }));
    else btn.textContent = '🔎';
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
    return btn;
}
// Resolved on click so a gallery opens the slide on screen; the creation-time URL is only a fallback.
function currentImageUrl(container, fallbackUrl) {
    const resolved = resolveMediaUrl(container);
    return resolved && resolved.kind === 'image' ? resolved.url : fallbackUrl;
}
const makeForensicsButton = (container, url, off) => makeToolButton({ marker: FORENSICS_BTN_MARKER, title: 'Run Error Level Analysis (ELA)', label: 'Run Error Level Analysis', icon: 'microscope', onClick: () => openELAPanel(currentImageUrl(container, url)) }, off);
const makeCropButton = (container, url, off) => makeToolButton({ marker: CROP_BTN_MARKER, title: 'Crop a region of this image', label: 'Crop image', icon: 'crop', onClick: () => openCropModalForImage(currentImageUrl(container, url)) }, off);
const makeCaliperButton = (container, url, off) => makeToolButton({ marker: CALIPER_BTN_MARKER, title: 'Measure distances on this image', label: 'Measure image', icon: 'ruler', onClick: () => openCaliperModalForImage(currentImageUrl(container, url)) }, off);
const makeVideoInspectButton = (container, off) => makeToolButton({ marker: VIDEO_INSPECT_BTN_MARKER, title: 'Inspect video frames', label: 'Inspect video frames', icon: 'film', onClick: () => openVideoKeyframeModal(container) }, off);
function applyVerificationButtons(root, settings) {
    if (typeof root.querySelectorAll !== 'function') return;
    const anyOn = settings.showImageForensicsButton || settings.showCropToolButton || settings.showCaliperButton || settings.showVideoKeyframeButton;
    [
        [settings.showImageForensicsButton, FORENSICS_BTN_MARKER],
        [settings.showCropToolButton, CROP_BTN_MARKER],
        [settings.showCaliperButton, CALIPER_BTN_MARKER],
        [settings.showVideoKeyframeButton, VIDEO_INSPECT_BTN_MARKER]
    ].forEach(([on, marker]) => { if (!on) root.querySelectorAll(`[${marker}]`).forEach((b) => b.remove()); });
    if (!anyOn) return;
    root.querySelectorAll('div[slot="post-media-container"]').forEach((container) => {
        const needF = settings.showImageForensicsButton && !container.querySelector(`[${FORENSICS_BTN_MARKER}]`);
        const needC = settings.showCropToolButton && !container.querySelector(`[${CROP_BTN_MARKER}]`);
        const needCali = settings.showCaliperButton && !container.querySelector(`[${CALIPER_BTN_MARKER}]`);
        const needV = settings.showVideoKeyframeButton && !container.querySelector(`[${VIDEO_INSPECT_BTN_MARKER}]`);
        if (!needF && !needC && !needCali && !needV) return;
        if (needV && container.querySelector('shreddit-player, shreddit-player-2, video')) {
            container.appendChild(makeVideoInspectButton(container, settings.showMediaDownloadButton ? '48px' : '8px'));
            if (window.getComputedStyle(container).position === 'static') container.style.setProperty('position', 'relative', 'important');
        }
        if (!needF && !needC && !needCali) return;
        const resolved = resolveMediaUrl(container);
        if (!resolved || resolved.kind !== 'image') return;
        if (window.getComputedStyle(container).position === 'static') container.style.setProperty('position', 'relative', 'important');
        let offset = 8;
        if (settings.showMediaDownloadButton) offset += 40;
        if (settings.showReverseImageSearchButton) offset += 40;
        if (needF) { container.appendChild(makeForensicsButton(container, resolved.url, `${offset}px`)); offset += 40; }
        if (needC) { container.appendChild(makeCropButton(container, resolved.url, `${offset}px`)); offset += 40; }
        if (needCali) { container.appendChild(makeCaliperButton(container, resolved.url, `${offset}px`)); }
    });
}
