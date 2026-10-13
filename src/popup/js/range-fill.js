export function paintRange(range) {
    const min = Number(range.min) || 0, max = Number(range.max) || 100;
    range.style.setProperty('--fill', (((Number(range.value) - min) / (max - min || 1)) * 100) + '%');
}

export function paintRanges() {
    document.querySelectorAll('input[type="range"]').forEach(paintRange);
}

export function initRangeFill() {
    document.querySelectorAll('input[type="range"]').forEach((range) => {
        range.addEventListener('input', () => paintRange(range));
    });
    paintRanges();
}
