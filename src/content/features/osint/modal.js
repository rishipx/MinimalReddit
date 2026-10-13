function handleVerificationModalKeydown(e) { if (e.key === 'Escape') closeVerificationModal(); }
const modalCleanups = [];
function closeVerificationModal() {
    const el = document.getElementById('mrx-verification-modal');
    if (el) el.remove();
    modalCleanups.splice(0).forEach((fn) => fn());
    document.removeEventListener('keydown', handleVerificationModalKeydown, true);
}
function createVerificationModalShell(title) {
    closeVerificationModal();
    const overlay = document.createElement('div');
    overlay.id = 'mrx-verification-modal';
    overlay.className = 'mrx-modal-overlay';
    const toolbar = document.createElement('div');
    toolbar.className = 'mrx-modal-toolbar';
    const titleEl = document.createElement('strong');
    titleEl.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mrx-modal-btn mrx-modal-btn-close';
    closeBtn.append(MRXIcons.el('x', { size: 14 }), ' Close');
    closeBtn.addEventListener('click', closeVerificationModal);
    toolbar.appendChild(titleEl);
    toolbar.appendChild(closeBtn);
    const stage = document.createElement('div');
    stage.className = 'mrx-modal-stage';
    overlay.appendChild(toolbar);
    overlay.appendChild(stage);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeVerificationModal(); });
    document.body.appendChild(overlay);
    document.addEventListener('keydown', handleVerificationModalKeydown, true);
    return { overlay, toolbar, stage };
}
