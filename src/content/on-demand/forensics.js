// Injected on demand by background/script-injector.js.

(function initForensics(global) {
    'use strict';


    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('failed to decode image'));
            img.src = src;
        });
    }

    function createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    // Re-saves as JPEG at a known quality and diffs against the original. A heuristic, not a verdict: edges, text and
    // low-quality sources also show high error. Large images are downscaled to bound memory.
    const MAX_ELA_PIXELS = 8_000_000;
    const MAX_ELA_DIMENSION = 8192;

    function canvasToBlob(canvas, type, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('could not encode image')), type, quality);
        });
    }

    async function runELA(sourceUrl, { quality = 0.9, amplify = 18 } = {}) {
        const img = await loadImage(sourceUrl);
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        if (!width || !height) throw new Error('image has no visible dimensions');

        const scale = Math.min(
            1,
            Math.sqrt(MAX_ELA_PIXELS / (width * height)),
            MAX_ELA_DIMENSION / Math.max(width, height)
        );
        const analysisWidth = Math.max(1, Math.floor(width * scale));
        const analysisHeight = Math.max(1, Math.floor(height * scale));
        const canvas = createCanvas(analysisWidth, analysisHeight);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('could not create analysis canvas');
        ctx.drawImage(img, 0, 0, analysisWidth, analysisHeight);
        const original = ctx.getImageData(0, 0, analysisWidth, analysisHeight);

        // Re-encode as a Blob rather than a base64 data URL to keep peak memory lower.
        const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
        const jpegUrl = URL.createObjectURL(jpegBlob);
        let resavedImg;
        try { resavedImg = await loadImage(jpegUrl); }
        finally { URL.revokeObjectURL(jpegUrl); }
        ctx.drawImage(resavedImg, 0, 0, analysisWidth, analysisHeight);
        const resaved = ctx.getImageData(0, 0, analysisWidth, analysisHeight);

        // Reuse the original pixel buffer as the output to avoid a third full-resolution ImageData allocation.
        const a = original.data;
        const b = resaved.data;
        for (let i = 0; i < a.length; i += 4) {
            a[i] = Math.min(255, Math.abs(a[i] - b[i]) * amplify);
            a[i + 1] = Math.min(255, Math.abs(a[i + 1] - b[i + 1]) * amplify);
            a[i + 2] = Math.min(255, Math.abs(a[i + 2] - b[i + 2]) * amplify);
            a[i + 3] = 255;
        }
        ctx.putImageData(original, 0, 0);
        const elaBlob = await canvasToBlob(canvas, 'image/png');

        return {
            width,
            height,
            analysisWidth,
            analysisHeight,
            elaBlob,
            originalUrl: sourceUrl,
            quality,
            amplify
        };
    }

    // Takes a fetched blob:/data: video URL (never Reddit's MSE player, whose frames are unreadable).
    // The video is detached so stepping never touches the page's own player.
    function createDetachedVideo(src) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.muted = true;
            video.playsInline = true;
            const onReady = () => {
                video.removeEventListener('loadedmetadata', onReady);
                resolve(video);
            };
            video.addEventListener('loadedmetadata', onReady);
            video.addEventListener('error', () => reject(new Error('video failed to load')));
            video.src = src;
        });
    }

    // Resolves once the frame at `time` has decoded; waiting for 'seeked' avoids grabbing a stale frame when stepping quickly.
    function seekTo(video, time) {
        return new Promise((resolve) => {
            const clamped = Math.max(0, Math.min(video.duration || time, time));
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolve(video.currentTime);
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = clamped;
        });
    }

    // Draws the current video frame onto a canvas and returns a PNG data URL.
    function captureVideoFrame(video) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) throw new Error('video has no decoded frame yet');
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        try {
            ctx.drawImage(video, 0, 0, width, height);
            return canvas.toDataURL('image/png');
        } catch (err) {
            // Shouldn't happen (sources are same-origin blob:/data:), but a specific error beats an opaque SecurityError if a caller breaks that.
            throw new Error('could not read this frame (tainted canvas); the source may not be a local blob/data URL');
        }
    }

    // Approximate frame stepping: seeks by ±(1/fps) seconds; not true keyframe seeking. `fps` is user-supplied (default 30).
    async function stepFrame(video, direction, fps) {
        const delta = (1 / Math.max(1, fps)) * (direction < 0 ? -1 : 1);
        const target = video.currentTime + delta;
        const landedAt = await seekTo(video, target);
        return { time: landedAt, dataUrl: captureVideoFrame(video) };
    }

    global.MRXForensics = {
        loadImage,
        runELA,
        createDetachedVideo,
        seekTo,
        stepFrame,
        captureVideoFrame
    };
})(window);
