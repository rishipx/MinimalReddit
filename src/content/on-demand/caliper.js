// Injected on demand by background/script-injector.js.

(function initCaliper(global) {
    'use strict';

    const OVERLAY_ID = 'mrx-caliper-overlay';
    const UNITS = ['m', 'cm', 'mm', 'ft', 'in', 'yd'];

    let openGeneration = 0; // guards a close/reopen race while the image loads
    let activeResizeHandler = null; // window resize listener of the open overlay

    function closeCaliperOverlay() {
        openGeneration++;
        global.__mrxCaliperCancelPending__ = null;
        const existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.remove();
        document.removeEventListener('keydown', onKeydown, true);
        if (activeResizeHandler) {
            window.removeEventListener('resize', activeResizeHandler);
            activeResizeHandler = null;
        }
    }

    function onKeydown(e) {
        if (e.key !== 'Escape') return;
        const cancelPending = global.__mrxCaliperCancelPending__;
        // Escape cancels a half-drawn line first; it closes the overlay only when nothing is pending.
        if (typeof cancelPending === 'function' && cancelPending()) return;
        closeCaliperOverlay();
    }

    function loadDisplayImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('failed to load image for measuring'));
            img.src = dataUrl;
        });
    }

    function distance(p1, p2) {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }

    function midpoint(p1, p2) {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }

    // Planar homography: four points of a known rectangle map image coordinates onto that surface.
    // Accurate for objects on the calibrated plane only; no lens or height correction.

    // Gaussian elimination with partial pivoting; only used for the 8x8 homography system below.
    function solveLinearSystem(A, b) {
        const n = A.length;
        const M = A.map((row, i) => [...row, b[i]]);
        for (let col = 0; col < n; col++) {
            let pivot = col;
            for (let r = col + 1; r < n; r++) {
                if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
            }
            [M[col], M[pivot]] = [M[pivot], M[col]];
            for (let r = 0; r < n; r++) {
                if (r === col) continue;
                const factor = M[r][col] / M[col][col];
                for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
            }
        }
        return M.map((row, i) => row[n] / row[i]);
    }

    // 3x3 homography (image to real-world plane) from 4 point pairs via the Direct Linear Transform, h33 fixed to 1.
    function computeHomography(imgPts, realPts) {
        const A = [];
        const b = [];
        for (let i = 0; i < 4; i++) {
            const { x, y } = imgPts[i];
            const { x: X, y: Y } = realPts[i];
            A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
            A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
        }
        const h = solveLinearSystem(A, b);
        return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
    }

    function applyHomography(H, pt) {
        const denom = H[6] * pt.x + H[7] * pt.y + H[8];
        return {
            x: (H[0] * pt.x + H[1] * pt.y + H[2]) / denom,
            y: (H[3] * pt.x + H[4] * pt.y + H[5]) / denom
        };
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    function svgEl(tag, attrs) {
        const el = document.createElementNS(SVG_NS, tag);
        Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    }

    // Opens a full-screen overlay for a data: URL of the image.
    function openCaliperOverlay(sourceDataUrl) {
        closeCaliperOverlay();
        const myGeneration = openGeneration;

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'mrx-caliper-overlay';

        const toolbar = document.createElement('div');
        toolbar.className = 'mrx-caliper-toolbar';

        const status = document.createElement('span');
        status.className = 'mrx-caliper-status';
        status.textContent = 'Click two points on the image to draw your first line.';

        const calibrationForm = document.createElement('span');
        calibrationForm.className = 'mrx-caliper-form';
        calibrationForm.hidden = true;

        const spacer = document.createElement('span');
        spacer.className = 'mrx-crop-spacer';

        const planeModeBtn = document.createElement('button');
        planeModeBtn.type = 'button';
        planeModeBtn.className = 'mrx-crop-btn';
        planeModeBtn.textContent = 'Add plane reference (4-point)';
        planeModeBtn.title = 'For angled surfaces: click 4 corners of a known rectangle to correct for perspective, instead of a single reference line';

        const undoBtn = document.createElement('button');
        undoBtn.type = 'button';
        undoBtn.className = 'mrx-crop-btn';
        undoBtn.textContent = 'Undo last line';
        undoBtn.disabled = true;

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'mrx-crop-btn';
        clearBtn.textContent = 'Clear all';
        clearBtn.disabled = true;

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'mrx-crop-btn mrx-crop-btn-close';
        closeBtn.appendChild(MRXIcons.el('x', { size: 16 })); closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', closeCaliperOverlay);

        toolbar.append(status, calibrationForm, spacer, planeModeBtn, undoBtn, clearBtn, closeBtn);

        const stage = document.createElement('div');
        stage.className = 'mrx-caliper-stage';

        const note = document.createElement('div');
        note.className = 'mrx-caliper-note';
        note.textContent = 'Simple (single-line) mode assumes measured objects lie in the same plane, at the same distance from the camera, as your reference line \u2014 a foreground object measured against a background reference (or vice versa) will read wrong. Use "Add plane reference" for objects lying flat on one angled surface (a table, floor, or wall shot at an angle): it corrects for that perspective. Neither mode corrects for objects at different heights above that surface.';

        overlay.append(toolbar, stage, note);
        document.body.appendChild(overlay);
        document.addEventListener('keydown', onKeydown, true);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCaliperOverlay(); });

        loadDisplayImage(sourceDataUrl).then((img) => {
            // Closed or superseded while the image loaded: stop before touching DOM that may be gone.
            if (myGeneration !== openGeneration) return;

            const displayImg = img.cloneNode();
            displayImg.className = 'mrx-caliper-image';
            stage.appendChild(displayImg);

            const svg = svgEl('svg', { class: 'mrx-caliper-svg' });
            stage.appendChild(svg);

            let pendingPoint = null; // image-space {x,y} of the first click of an in-progress line, or null
            let pixelsPerUnit = null;
            let unit = 'm';
            const lines = []; // { p1, p2, pixelLength, kind: 'calibration'|'measurement', realLength?, unit?, method?, group: <SVG g> }

            // Plane-calibration state. Once planeH is set it replaces the single-line ratio for new lines.
            let planeH = null;
            let planeUnit = null;
            let planeCorners = null; // the 4 image-space points used to derive planeH, kept for redrawing the quad
            let pickingPlane = false;
            let planePickPoints = [];

            const FIRST_LINE_PROMPT = 'Click two points on the image to draw your first line.';
            function stopPlanePicking() {
                pickingPlane = false;
                planePickPoints = [];
                planeModeBtn.textContent = 'Add plane reference (4-point)';
                calibrationForm.hidden = true;
            }

            global.__mrxCaliperCancelPending__ = () => {
                if (pickingPlane) {
                    stopPlanePicking();
                    if (!lines.length) status.textContent = FIRST_LINE_PROMPT;
                    redrawAll();
                    return true;
                }
                if (pendingPoint === null) return false;
                pendingPoint = null;
                redrawPreview(null);
                return true;
            };

            function toImageSpace(clientX, clientY) {
                const rect = displayImg.getBoundingClientRect();
                const scaleX = img.naturalWidth / rect.width;
                const scaleY = img.naturalHeight / rect.height;
                return {
                    x: Math.max(0, Math.min(img.naturalWidth, (clientX - rect.left) * scaleX)),
                    y: Math.max(0, Math.min(img.naturalHeight, (clientY - rect.top) * scaleY))
                };
            }
            function toScreenSpace(imgPt) {
                const rect = displayImg.getBoundingClientRect();
                const scaleX = rect.width / img.naturalWidth;
                const scaleY = rect.height / img.naturalHeight;
                // Relative to the stage (the SVG's positioning context), not the viewport.
                const stageRect = stage.getBoundingClientRect();
                return {
                    x: (rect.left - stageRect.left) + imgPt.x * scaleX,
                    y: (rect.top - stageRect.top) + imgPt.y * scaleY
                };
            }

            let previewGroup = null;
            function redrawPreview(cursorImgPt) {
                if (previewGroup) { previewGroup.remove(); previewGroup = null; }
                if (!pendingPoint) return;
                const a = toScreenSpace(pendingPoint);
                previewGroup = svgEl('g', { class: 'mrx-caliper-preview' });
                previewGroup.appendChild(svgEl('circle', { cx: a.x, cy: a.y, r: 5 }));
                if (cursorImgPt) {
                    const b = toScreenSpace(cursorImgPt);
                    previewGroup.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
                }
                svg.appendChild(previewGroup);
            }

            function formatPixelLabel(pixelLength) {
                return `${pixelLength.toFixed(1)}px`;
            }
            function formatRealLabel(realLength, lineUnit) {
                return `\u2248 ${realLength.toFixed(2)} ${lineUnit}`;
            }

            function renderPlaneQuad() {
                if (!planeCorners) return;
                const pts = planeCorners.map(toScreenSpace);
                const g = svgEl('g', { class: 'mrx-caliper-plane' });
                for (let i = 0; i < 4; i++) {
                    const a = pts[i];
                    const b = pts[(i + 1) % 4];
                    g.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
                }
                pts.forEach((p) => g.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 4 })));
                svg.appendChild(g);
            }

            function renderPlanePicking() {
                if (planePickPoints.length === 0) return;
                const pts = planePickPoints.map(toScreenSpace);
                const g = svgEl('g', { class: 'mrx-caliper-plane-picking' });
                for (let i = 0; i < pts.length - 1; i++) {
                    g.appendChild(svgEl('line', { x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y }));
                }
                pts.forEach((p) => g.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 5 })));
                svg.appendChild(g);
            }

            function renderLine(line) {
                const a = toScreenSpace(line.p1);
                const b = toScreenSpace(line.p2);
                const mid = midpoint(a, b);
                const g = svgEl('g', { class: `mrx-caliper-line mrx-caliper-line-${line.kind}` });
                g.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
                g.appendChild(svgEl('circle', { cx: a.x, cy: a.y, r: 4 }));
                g.appendChild(svgEl('circle', { cx: b.x, cy: b.y, r: 4 }));

                const labelLines = [formatPixelLabel(line.pixelLength)];
                if (line.kind === 'calibration') labelLines.push(`reference = ${line.realLength} ${line.unit}`);
                else if (typeof line.realLength === 'number') {
                    const suffix = line.method === 'plane' ? ' (corrected)' : '';
                    labelLines.push(formatRealLabel(line.realLength, line.unit) + suffix);
                }

                const text = svgEl('text', { x: mid.x, y: mid.y - 8, class: 'mrx-caliper-label' });
                labelLines.forEach((str, i) => {
                    const tspan = svgEl('tspan', { x: mid.x, dy: i === 0 ? 0 : 14 });
                    tspan.textContent = str;
                    text.appendChild(tspan);
                });
                g.appendChild(text);
                svg.appendChild(g);
                line.group = g;
            }

            function redrawAll() {
                svg.replaceChildren();
                renderPlaneQuad();
                renderPlanePicking();
                lines.forEach(renderLine);
                redrawPreview(null);
            }

            function updateToolbarState() {
                undoBtn.disabled = lines.length === 0;
                clearBtn.disabled = lines.length === 0;
            }

            function showCalibrationPrompt(line) {
                calibrationForm.hidden = false;
                calibrationForm.replaceChildren();

                const label = document.createElement('span');
                label.textContent = `Set this ${formatPixelLabel(line.pixelLength)} line as your reference: `;

                const lengthInput = document.createElement('input');
                lengthInput.type = 'number';
                lengthInput.min = '0';
                lengthInput.step = 'any';
                lengthInput.placeholder = 'length';
                lengthInput.className = 'mrx-caliper-input';

                const unitSelect = document.createElement('select');
                unitSelect.className = 'mrx-caliper-select';
                UNITS.forEach((u) => {
                    const opt = document.createElement('option');
                    opt.value = u;
                    opt.textContent = u;
                    if (u === unit) opt.selected = true;
                    unitSelect.appendChild(opt);
                });

                const setBtn = document.createElement('button');
                setBtn.type = 'button';
                setBtn.className = 'mrx-crop-btn';
                setBtn.textContent = 'Set as reference';

                function commit() {
                    const realLength = parseFloat(lengthInput.value);
                    if (!Number.isFinite(realLength) || realLength <= 0) {
                        lengthInput.focus();
                        return;
                    }
                    unit = unitSelect.value;
                    pixelsPerUnit = line.pixelLength / realLength;
                    line.kind = 'calibration';
                    line.realLength = realLength;
                    line.unit = unit;
                    // Recalculate all estimates from the active reference scale.
                    lines.forEach((l) => {
                        if (l === line) return;
                        if (l.kind === 'calibration') l.kind = 'measurement'; // only one active reference at a time
                        l.realLength = l.pixelLength / pixelsPerUnit;
                        l.unit = unit;
                    });
                    calibrationForm.hidden = true;
                    status.textContent = `Calibrated: ${pixelsPerUnit.toFixed(2)} px = 1 ${unit}. New lines will show an estimated real-world length automatically.`;
                    redrawAll();
                }

                setBtn.addEventListener('click', commit);
                lengthInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });

                calibrationForm.append(label, lengthInput, unitSelect, setBtn);
                lengthInput.focus();
            }

            function showPlaneCalibrationPrompt(corners) {
                calibrationForm.hidden = false;
                calibrationForm.replaceChildren();

                const label = document.createElement('span');
                label.textContent = 'Real size of that rectangle: ';

                const widthInput = document.createElement('input');
                widthInput.type = 'number';
                widthInput.min = '0';
                widthInput.step = 'any';
                widthInput.placeholder = 'width';
                widthInput.className = 'mrx-caliper-input';

                const xSpan = document.createElement('span');
                xSpan.textContent = '\u00D7';

                const heightInput = document.createElement('input');
                heightInput.type = 'number';
                heightInput.min = '0';
                heightInput.step = 'any';
                heightInput.placeholder = 'height';
                heightInput.className = 'mrx-caliper-input';

                const unitSelect = document.createElement('select');
                unitSelect.className = 'mrx-caliper-select';
                UNITS.forEach((u) => {
                    const opt = document.createElement('option');
                    opt.value = u;
                    opt.textContent = u;
                    if (u === unit) opt.selected = true;
                    unitSelect.appendChild(opt);
                });

                const setBtn = document.createElement('button');
                setBtn.type = 'button';
                setBtn.className = 'mrx-crop-btn';
                setBtn.textContent = 'Set plane reference';

                function commit() {
                    const w = parseFloat(widthInput.value);
                    const h = parseFloat(heightInput.value);
                    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
                        (Number.isFinite(w) && w > 0 ? heightInput : widthInput).focus();
                        return;
                    }
                    unit = unitSelect.value;
                    // Corners are used in click order as (0,0)->(w,0)->(w,h)->(0,h); either winding direction works.
                    const realCorners = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
                    planeH = computeHomography(corners, realCorners);
                    planeUnit = unit;
                    planeCorners = corners;
                    planePickPoints = [];
                    calibrationForm.hidden = true;
                    status.textContent = `Plane calibrated (${w}\u00D7${h} ${unit}). New lines drawn anywhere on this surface will show a perspective-corrected estimate.`;
                    redrawAll();
                }

                setBtn.addEventListener('click', commit);
                heightInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
                widthInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') heightInput.focus(); });

                calibrationForm.append(label, widthInput, xSpan, heightInput, unitSelect, setBtn);
                widthInput.focus();
            }

            function finalizeLine(p1, p2) {
                const pixelLength = distance(p1, p2);
                if (pixelLength < 2) return; // same point twice, not a real line

                const line = { p1, p2, pixelLength, kind: 'measurement' };
                if (planeH) {
                    const r1 = applyHomography(planeH, p1);
                    const r2 = applyHomography(planeH, p2);
                    line.realLength = distance(r1, r2);
                    line.unit = planeUnit;
                    line.method = 'plane';
                    status.textContent = `Line drawn: ${formatPixelLabel(pixelLength)} \u2192 ${formatRealLabel(line.realLength, line.unit)} (perspective-corrected)`;
                } else if (pixelsPerUnit) {
                    line.realLength = pixelLength / pixelsPerUnit;
                    line.unit = unit;
                    line.method = 'simple';
                    status.textContent = `Line drawn: ${formatPixelLabel(pixelLength)} \u2192 ${formatRealLabel(line.realLength, line.unit)}`;
                } else {
                    status.textContent = `Line drawn: ${formatPixelLabel(pixelLength)}. Not calibrated yet \u2014 set a reference below, or use "Add plane reference" for an angled surface.`;
                }
                lines.push(line);
                redrawAll();
                updateToolbarState();
                // Only offered without a plane calibration; once the 4-point method is active, a single-line reference would just downgrade accuracy.
                if (!planeH) showCalibrationPrompt(line);
            }

            stage.addEventListener('click', (e) => {
                if (e.target !== displayImg && e.target !== stage && e.target !== svg) return;
                const pt = toImageSpace(e.clientX, e.clientY);

                if (pickingPlane) {
                    planePickPoints.push(pt);
                    redrawAll();
                    if (planePickPoints.length === 4) {
                        pickingPlane = false;
                        planeModeBtn.textContent = 'Add plane reference (4-point)';
                        showPlaneCalibrationPrompt(planePickPoints.slice());
                    } else {
                        status.textContent = `Corner ${planePickPoints.length} of 4 placed \u2014 click the next corner, going around the rectangle's edge.`;
                    }
                    return;
                }

                if (pendingPoint === null) {
                    pendingPoint = pt;
                    redrawPreview(pt);
                } else {
                    const first = pendingPoint;
                    pendingPoint = null;
                    finalizeLine(first, pt);
                    redrawPreview(null);
                }
            });

            stage.addEventListener('mousemove', (e) => {
                if (pendingPoint === null) return;
                redrawPreview(toImageSpace(e.clientX, e.clientY));
            });

            planeModeBtn.addEventListener('click', () => {
                if (pickingPlane) {
                    // Same as pressing Escape mid-pick.
                    stopPlanePicking();
                    if (!lines.length) status.textContent = FIRST_LINE_PROMPT;
                    redrawAll();
                    return;
                }
                if (planeH && !confirm('Replace the current plane calibration with a new one?')) return;

                pendingPoint = null;
                pickingPlane = true;
                planePickPoints = [];
                calibrationForm.hidden = true;
                planeModeBtn.textContent = 'Cancel plane picking';
                status.textContent = "Click the 4 corners of a known flat rectangle, in order around its edge, lying on the same surface as what you want to measure.";
                redrawAll();
            });

            undoBtn.addEventListener('click', () => {
                lines.pop();
                calibrationForm.hidden = true;
                if (!lines.some((l) => l.kind === 'calibration')) pixelsPerUnit = null;

                if (lines.length === 0) {
                    status.textContent = FIRST_LINE_PROMPT;
                } else if (!pixelsPerUnit) {
                    status.textContent = 'Last line removed \u2014 not calibrated. Set a new reference to resume real-world estimates.';
                } else {
                    status.textContent = `Last line removed. Calibrated: ${pixelsPerUnit.toFixed(2)} px = 1 ${unit}.`;
                }
                redrawAll();
                updateToolbarState();
            });

            clearBtn.addEventListener('click', () => {
                lines.length = 0;
                pixelsPerUnit = null;
                planeH = null;
                planeUnit = null;
                planeCorners = null;
                stopPlanePicking();
                status.textContent = FIRST_LINE_PROMPT;
                redrawAll();
                updateToolbarState();
            });

            // Re-project lines on resize; image-space points never change, only where they land on screen.
            window.addEventListener('resize', redrawAll);
            activeResizeHandler = redrawAll;
        }).catch((err) => {
            stage.textContent = `Couldn't load this image for measuring (${err.message}).`;
        });
    }

    global.MRXCaliper = { openCaliperOverlay, closeCaliperOverlay };
})(window);
