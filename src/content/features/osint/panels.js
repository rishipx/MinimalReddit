async function openELAPanel(mediaUrl) {
    const { toolbar, stage } = createVerificationModalShell('Error Level Analysis');
    stage.textContent = 'Fetching image…';
    const fetched = await fetchMediaBlob(mediaUrl);
    if (!stage.isConnected) return;
    if (!fetched || !fetched.ok) {
        stage.textContent = `Couldn't fetch this image (${(fetched && fetched.error) || 'unknown error'}).`;
        return;
    }
    // Keep the source as a Blob URL; large files would balloon as base64.
    const sourceUrl = URL.createObjectURL(fetched.blob);
    modalCleanups.push(() => URL.revokeObjectURL(sourceUrl));
    if (!(await ensureUtil('forensics', 'MRXForensics'))) {
        if (stage.isConnected) stage.textContent = 'Could not load the analysis tools.';
        return;
    }
    if (!stage.isConnected) return;

    let quality = 0.9, amplify = 18, renderVersion = 0, activeElaUrl = null, currentElaBlob = null;
    modalCleanups.push(() => { if (activeElaUrl) URL.revokeObjectURL(activeElaUrl); });

    // One normal-flow layout, so tall results scroll below the toolbar, not under it.
    const layout = document.createElement('div');
    layout.className = 'mrx-ela-layout';
    const status = document.createElement('p');
    status.className = 'mrx-ela-status';
    status.setAttribute('role', 'status');
    status.textContent = 'Ready to analyze image.';

    const columns = document.createElement('div');
    columns.className = 'mrx-ela-columns';
    const origFig = document.createElement('figure');
    const origImg = document.createElement('img');
    origImg.alt = 'Original image';
    const origCap = document.createElement('figcaption');
    origCap.textContent = 'Original';
    origFig.append(origImg, origCap);

    const elaFig = document.createElement('figure');
    const elaImg = document.createElement('img');
    elaImg.alt = 'Error level analysis result';
    const elaCap = document.createElement('figcaption');
    elaCap.textContent = 'ELA result';
    elaFig.append(elaImg, elaCap);
    columns.append(origFig, elaFig);

    const note = document.createElement('p');
    note.className = 'mrx-modal-note';
    note.textContent = 'ELA is a heuristic aid, not proof of editing.';
    const actions = document.createElement('div');
    actions.className = 'mrx-ela-actions';
    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'mrx-modal-btn mrx-ela-download';
    dlBtn.textContent = 'Download ELA image';
    dlBtn.disabled = true;
    dlBtn.addEventListener('click', () => {
        if (currentElaBlob) triggerDownload(currentElaBlob, 'ela-result.png');
    });
    actions.appendChild(dlBtn);
    layout.append(status, columns, note, actions);
    stage.replaceChildren(layout);

    async function render() {
        const version = ++renderVersion;
        dlBtn.disabled = true;
        status.textContent = 'Running analysis…';
        let result;
        try {
            result = await window.MRXForensics.runELA(sourceUrl, { quality, amplify });
        } catch (err) {
            if (version === renderVersion && stage.isConnected) {
                status.textContent = `Analysis failed: ${(err && err.message) || 'unknown error'}. Try a smaller image.`;
            }
            return;
        }
        if (version !== renderVersion || !stage.isConnected) return;

        currentElaBlob = result.elaBlob;
        if (activeElaUrl) URL.revokeObjectURL(activeElaUrl);
        activeElaUrl = URL.createObjectURL(result.elaBlob);
        origImg.src = result.originalUrl;
        elaImg.src = activeElaUrl;
        origCap.textContent = `Original (${result.width}\u00D7${result.height})`;
        elaCap.textContent = `ELA (quality ${Math.round(quality * 100)}, \u00D7${amplify})`;
        if (result.analysisWidth !== result.width || result.analysisHeight !== result.height) {
            status.textContent = `Large image optimized for analysis: ${result.analysisWidth}\u00D7${result.analysisHeight} pixels. Original: ${result.width}\u00D7${result.height}.`;
        } else {
            status.textContent = `Analysis complete (${result.width}\u00D7${result.height}).`;
        }
        dlBtn.disabled = false;
    }

    const qRow = document.createElement('label');
    qRow.append('Quality ');
    const qInput = document.createElement('input');
    qInput.type = 'range'; qInput.min = '0.5'; qInput.max = '0.99'; qInput.step = '0.01'; qInput.value = String(quality);
    qInput.addEventListener('change', () => { quality = parseFloat(qInput.value); render(); });
    qRow.appendChild(qInput);
    const aRow = document.createElement('label');
    aRow.append('Amplify ');
    const aInput = document.createElement('input');
    aInput.type = 'number'; aInput.min = '1'; aInput.max = '60'; aInput.value = String(amplify);
    aInput.addEventListener('change', () => { amplify = Math.max(1, Math.min(60, parseInt(aInput.value, 10) || 18)); aInput.value = String(amplify); render(); });
    aRow.appendChild(aInput);
    toolbar.append(qRow, aRow);
    render();
}
async function openCropModalForImage(mediaUrl) {
    const { stage } = createVerificationModalShell('Loading image for cropping…');
    stage.textContent = 'Fetching image…';
    const fetched = await fetchAsDataURL(mediaUrl);
    closeVerificationModal();
    if (!fetched || !fetched.ok) { alert(`Couldn't fetch this image for cropping (${(fetched && fetched.error) || 'unknown error'}).`); return; }
    if (!(await ensureUtil('crop', 'MRXCrop'))) { alert('Could not load the crop tool.'); return; }
    window.MRXCrop.openCropOverlay(fetched.dataUrl, {
        onExport: (result) => {
            const objectUrl = URL.createObjectURL(result.blob);
            triggerDownload(objectUrl, `crop-${result.width}x${result.height}.png`);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        }
    });
}
async function openCaliperModalForImage(mediaUrl) {
    const { stage } = createVerificationModalShell('Loading image for measuring…');
    stage.textContent = 'Fetching image…';
    const fetched = await fetchAsDataURL(mediaUrl);
    closeVerificationModal();
    if (!fetched || !fetched.ok) { alert(`Couldn't fetch this image for measuring (${(fetched && fetched.error) || 'unknown error'}).`); return; }
    if (!(await ensureUtil('caliper', 'MRXCaliper'))) { alert('Could not load the measuring tool.'); return; }
    window.MRXCaliper.openCaliperOverlay(fetched.dataUrl);
}
// Pauses every <video> in a post's media container, including ones inside (nested) open shadow roots.
function pauseContainerVideos(container) {
    const seen = new Set();
    const visit = (root) => {
        if (!root || seen.has(root) || typeof root.querySelectorAll !== 'function') return;
        seen.add(root);
        root.querySelectorAll('video').forEach((v) => { try { if (!v.paused) v.pause(); } catch (e) { /* ignore */ } });
        root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) visit(el.shadowRoot); });
    };
    visit(container);
}
async function openVideoKeyframeModal(container) {
    // The inspector plays its own copy; stop the post's player so the two don't play at once.
    pauseContainerVideos(container);
    const { stage } = createVerificationModalShell('Video Keyframe Inspector');
    stage.textContent = 'Resolving video source…';
    const resolved = resolveMediaUrl(container);
    if (!resolved || resolved.kind !== 'video') { stage.textContent = "Couldn't find a directly fetchable video file for this post."; return; }
    stage.textContent = 'Fetching video…';
    const videoUrl = await pickVideoUrl(resolved);
    if (!videoUrl) { stage.textContent = "Couldn't find a directly fetchable video file for this post."; return; }
    const fetched = await fetchMediaBlob(videoUrl);
    if (!fetched.ok) { stage.textContent = `Couldn't fetch this video (${fetched.error || 'unknown error'}).`; return; }
    const objectUrl = URL.createObjectURL(fetched.blob);
    modalCleanups.push(() => URL.revokeObjectURL(objectUrl));
    if (!stage.isConnected) return; // modal was closed while the video downloaded
    pauseContainerVideos(container); // in case the feed player resumed (autoplay) while fetching
    stage.textContent = 'Loading video…';
    let video;
    if (!(await ensureUtil('forensics', 'MRXForensics'))) { stage.textContent = 'Could not load the video tools.'; return; }
    try { video = await window.MRXForensics.createDetachedVideo(objectUrl); }
    catch (err) { stage.textContent = `Could not load this video (${err.message}).`; return; }
    if (!stage.isConnected) return;
    video.controls = true;
    stage.replaceChildren();
    const wrap = document.createElement('div');
    wrap.className = 'mrx-video-inspect-stage';
    wrap.appendChild(video);
    const controls = document.createElement('div');
    controls.className = 'mrx-video-inspect-controls';
    const backBtn = document.createElement('button');
    backBtn.type = 'button'; backBtn.className = 'mrx-modal-btn'; backBtn.append(MRXIcons.el('chevron-left', { size: 14 }), ' -1 frame');
    const timeLabel = document.createElement('span');
    timeLabel.className = 'mrx-video-inspect-time';
    const fwdBtn = document.createElement('button');
    fwdBtn.type = 'button'; fwdBtn.className = 'mrx-modal-btn'; fwdBtn.append('+1 frame ', MRXIcons.el('chevron-right', { size: 14 }));
    const fpsLabel = document.createElement('label');
    fpsLabel.append('FPS ');
    const fpsInput = document.createElement('input');
    fpsInput.type = 'number'; fpsInput.min = '1'; fpsInput.max = '120'; fpsInput.value = '30';
    fpsLabel.appendChild(fpsInput);
    const snapBtn = document.createElement('button');
    snapBtn.type = 'button'; snapBtn.className = 'mrx-modal-btn'; snapBtn.textContent = '📷 Snapshot';
    controls.append(backBtn, timeLabel, fwdBtn, fpsLabel, snapBtn);
    const snaps = document.createElement('div');
    snaps.className = 'mrx-video-snapshots';
    wrap.append(controls, snaps);
    stage.appendChild(wrap);
    const updateTime = () => { timeLabel.textContent = `${video.currentTime.toFixed(3)}s / ${(video.duration || 0).toFixed(3)}s`; };
    video.addEventListener('loadedmetadata', updateTime);
    video.addEventListener('timeupdate', updateTime);
    updateTime();
    let stepping = false;
    async function doStep(direction) {
        if (stepping) return;
        stepping = true; backBtn.disabled = true; fwdBtn.disabled = true;
        video.pause();
        try {
            const fps = Math.max(1, parseInt(fpsInput.value, 10) || 30);
            await window.MRXForensics.stepFrame(video, direction, fps);
            updateTime();
        } catch (err) { console.error(err); }
        finally { stepping = false; backBtn.disabled = false; fwdBtn.disabled = false; }
    }
    backBtn.addEventListener('click', () => doStep(-1));
    fwdBtn.addEventListener('click', () => doStep(1));
    snapBtn.addEventListener('click', () => {
        let dataUrl;
        try { dataUrl = window.MRXForensics.captureVideoFrame(video); }
        catch (err) { alert(err.message); return; }
        const item = document.createElement('div');
        item.className = 'mrx-video-snapshot';
        const img = document.createElement('img');
        img.src = dataUrl;
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `frame-${video.currentTime.toFixed(3)}s.png`;
        link.textContent = '⇩';
        item.append(img, link);
        snaps.appendChild(item);
    });
}
