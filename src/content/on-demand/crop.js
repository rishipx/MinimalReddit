// Injected on demand by background/script-injector.js.

(function initCrop(global) {
    'use strict';

    const OVERLAY_ID = 'mrx-crop-overlay';

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    // Resolves the <img> (for display) and its natural size (to map the selection back to real pixels).
    function loadDisplayImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('failed to load image for cropping'));
            img.src = dataUrl;
        });
    }

    let activeDragHandlers = null; // drag listeners of the open overlay
    let openGeneration = 0; // bumped on close; guards the image-load race

    function closeCropOverlay() {
        openGeneration++;
        const existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.remove();
        document.removeEventListener('keydown', onKeydown, true);
        if (activeDragHandlers) {
            window.removeEventListener('mousemove', activeDragHandlers.onMouseMove);
            window.removeEventListener('mouseup', activeDragHandlers.onMouseUp);
            activeDragHandlers = null;
        }
    }

    function onKeydown(e) {
        if (e.key === 'Escape') closeCropOverlay();
    }

    // Exports the rectangle (natural pixels) as a Blob (clean download) and a data URL (direct reuse).
    function exportCrop(img, rect) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(rect.w));
            canvas.height = Math.max(1, Math.round(rect.h));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (!blob) { reject(new Error('crop export failed')); return; }
                resolve({ blob, dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
            }, 'image/png');
        });
    }

    // onExport({ blob, dataUrl, width, height }) fires per confirmed crop; the overlay stays open for more regions.
    function openCropOverlay(sourceDataUrl, { onExport } = {}) {
        closeCropOverlay(); // invalidate any pending load from a prior overlay instance
        const myGeneration = openGeneration;

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'mrx-crop-overlay';

        const toolbar = document.createElement('div');
        toolbar.className = 'mrx-crop-toolbar';
        toolbar.innerHTML = `
            <span class="mrx-crop-hint">Drag on the image to select a region</span>
            <span class="mrx-crop-spacer"></span>
            <button type="button" class="mrx-crop-btn" data-mrx-crop-action="export" disabled>Export selection</button>
            <button type="button" class="mrx-crop-btn" data-mrx-crop-action="reset" disabled>Reset</button>
            <button type="button" class="mrx-crop-btn mrx-crop-btn-close" data-mrx-crop-action="close" aria-label="Close"></button>
        `;
        toolbar.querySelector('[data-mrx-crop-action="close"]').appendChild(MRXIcons.el('x', { size: 16 }));

        const stage = document.createElement('div');
        stage.className = 'mrx-crop-stage';

        overlay.appendChild(toolbar);
        overlay.appendChild(stage);
        document.body.appendChild(overlay);
        document.addEventListener('keydown', onKeydown, true);

        toolbar.querySelector('[data-mrx-crop-action="close"]').addEventListener('click', closeCropOverlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCropOverlay(); });

        loadDisplayImage(sourceDataUrl).then((img) => {
            // Bail out if the overlay was closed or superseded while the image loaded, so no listeners leak.
            if (myGeneration !== openGeneration) return;

            // Displayed fit-to-viewport; drag coordinates are converted to natural pixels so exports are full resolution.
            const displayImg = img.cloneNode();
            displayImg.className = 'mrx-crop-image';
            stage.appendChild(displayImg);

            const selectionBox = document.createElement('div');
            selectionBox.className = 'mrx-crop-selection';
            selectionBox.style.display = 'none';
            stage.appendChild(selectionBox);

            const exportBtn = toolbar.querySelector('[data-mrx-crop-action="export"]');
            const resetBtn = toolbar.querySelector('[data-mrx-crop-action="reset"]');

            let dragStart = null;
            let currentRectImageSpace = null; // { x, y, w, h } in real image pixels

            function toImageSpace(clientX, clientY) {
                const rect = displayImg.getBoundingClientRect();
                const scaleX = img.naturalWidth / rect.width;
                const scaleY = img.naturalHeight / rect.height;
                const x = clamp((clientX - rect.left) * scaleX, 0, img.naturalWidth);
                const y = clamp((clientY - rect.top) * scaleY, 0, img.naturalHeight);
                return { x, y, rect, scaleX, scaleY };
            }

            function updateSelectionVisual(startClient, curClient) {
                const left = Math.min(startClient.x, curClient.x);
                const top = Math.min(startClient.y, curClient.y);
                const w = Math.abs(curClient.x - startClient.x);
                const h = Math.abs(curClient.y - startClient.y);
                selectionBox.style.display = 'block';
                selectionBox.style.left = `${left}px`;
                selectionBox.style.top = `${top}px`;
                selectionBox.style.width = `${w}px`;
                selectionBox.style.height = `${h}px`;
            }

            stage.addEventListener('mousedown', (e) => {
                if (e.target !== displayImg && e.target !== stage) return;
                e.preventDefault();
                const stageRect = stage.getBoundingClientRect();
                dragStart = { clientX: e.clientX - stageRect.left, clientY: e.clientY - stageRect.top };
                const origin = { x: dragStart.clientX, y: dragStart.clientY };
                updateSelectionVisual(origin, origin);
            });

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            activeDragHandlers = { onMouseMove, onMouseUp };

            function onMouseMove(e) {
                if (!dragStart) return;
                const stageRect = stage.getBoundingClientRect();
                const cur = { clientX: e.clientX - stageRect.left, clientY: e.clientY - stageRect.top };
                updateSelectionVisual({ x: dragStart.clientX, y: dragStart.clientY }, { x: cur.clientX, y: cur.clientY });
            }

            function onMouseUp(e) {
                if (!dragStart) return;
                const stageRect = stage.getBoundingClientRect();
                const startImg = toImageSpace(stageRect.left + dragStart.clientX, stageRect.top + dragStart.clientY);
                const endImg = toImageSpace(e.clientX, e.clientY);
                dragStart = null;

                const x = Math.min(startImg.x, endImg.x);
                const y = Math.min(startImg.y, endImg.y);
                const w = Math.abs(endImg.x - startImg.x);
                const h = Math.abs(endImg.y - startImg.y);
                // A click without a real drag isn't a selection; 4px sits above accidental jitter.
                if (w < 4 || h < 4) {
                    currentRectImageSpace = null;
                    selectionBox.style.display = 'none';
                    exportBtn.disabled = true;
                    resetBtn.disabled = true;
                    return;
                }
                currentRectImageSpace = { x, y, w, h };
                exportBtn.disabled = false;
                resetBtn.disabled = false;
            }

            resetBtn.addEventListener('click', () => {
                currentRectImageSpace = null;
                selectionBox.style.display = 'none';
                exportBtn.disabled = true;
                resetBtn.disabled = true;
            });

            exportBtn.addEventListener('click', async () => {
                if (!currentRectImageSpace) return;
                exportBtn.disabled = true;
                exportBtn.textContent = 'Exporting…';
                try {
                    const result = await exportCrop(img, currentRectImageSpace);
                    if (typeof onExport === 'function') onExport(result);
                } catch (err) {
                    console.error('[Minimal Reddit] crop export failed:', err);
                } finally {
                    exportBtn.disabled = false;
                    exportBtn.textContent = 'Export selection';
                }
            });
        }).catch((err) => {
            stage.textContent = `Couldn't load this image for cropping (${err.message}).`;
        });
    }

    global.MRXCrop = { openCropOverlay, closeCropOverlay };
})(window);
