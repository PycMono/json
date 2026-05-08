/**
 * img-pdf.js — Images to PDF (jsPDF)
 * Complete rewrite using itb-* design system
 * Client-side PDF generation with drag-drop reorder, preview, and download
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     Constants
  ════════════════════════════════════════════════════════════ */
  const MAX_FILES = 50;
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','image/gif','image/bmp','image/tiff'];

  /* ═══════════════════════════════════════════════════════════
     State
  ════════════════════════════════════════════════════════════ */
  const state = {
    images: [],       // { id, file, img, url, naturalW, naturalH }
    objectURLs: [],   // Track for cleanup
    curPage: 0,
    dragSrcIdx: null,
    pdfDoc: null,
    converting: false,
  };

  /* ═══════════════════════════════════════════════════════════
     DOM refs
  ════════════════════════════════════════════════════════════ */
  const zone          = document.getElementById('itbUploadZone');
  const fileInput     = document.getElementById('itbFileInput');
  const queueWrap     = document.getElementById('itbQueueWrap');
  const queue         = document.getElementById('itbPdfQueue');
  const queueCount    = document.getElementById('itbQueueCount');
  const settingsWrap  = document.getElementById('itbSettingsWrap');
  const previewCanvas = document.getElementById('ipdfPreviewCanvas');
  const pCtx          = previewCanvas.getContext('2d');
  const progressWrap  = document.getElementById('itbProgressWrap');
  const progressBar   = document.getElementById('ipdfProgressBar');
  const progressLabel = document.getElementById('ipdfProgressLabel');
  const downloadWrap  = document.getElementById('itbDownloadWrap');
  const downloadInfo  = document.getElementById('ipdfDownloadInfo');

  /* ═══════════════════════════════════════════════════════════
     Upload handlers
  ════════════════════════════════════════════════════════════ */
  if (fileInput) {
    fileInput.addEventListener('change', (e) => ipdfAddFiles(Array.from(e.target.files)));
  }

  // Paste support
  document.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.files.length) return;
    const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
    if (files.length) ipdfAddFiles(files);
  });

  /* ═══════════════════════════════════════════════════════════
     Public API (called from HTML)
  ════════════════════════════════════════════════════════════ */
  window.ipdfAddFiles = function(files) {
    const arr = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) {
        itbToast(esc(f.name) + ': ' + (itbI18n('error.common.format_not_supported') || 'Format not supported'), 'error');
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        const mb = (f.size / 1048576).toFixed(1);
        itbToast(`${esc(f.name)} (${mb}MB): ` + (itbI18n('error.common.file_too_large') || 'File too large') + ` (max ${MAX_FILE_SIZE/1048576}MB)`, 'error');
        return false;
      }
      return true;
    });

    if (state.images.length + arr.length > MAX_FILES) {
      itbToast(itbI18n('error.common.too_many_files') || `Maximum ${MAX_FILES} images`, 'warning');
      return;
    }

    const promises = arr.map(f => new Promise(resolve => {
      const url = URL.createObjectURL(f);
      state.objectURLs.push(url);
      const img = new Image();
      img.onload = () => resolve({ id: crypto.randomUUID ? crypto.randomUUID() : (Date.now() + Math.random()).toString(36), file: f, img, url, naturalW: img.naturalWidth, naturalH: img.naturalHeight });
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    }));

    Promise.all(promises).then(results => {
      const valid = results.filter(Boolean);
      state.images.push(...valid);
      renderQueue();
      updateUI();
      ipdfDrawPreview();
      if (valid.length && typeof gaTrackUpload === 'function') {
        const totalMB = valid.reduce((s, v) => s + v.file.size, 0) / 1048576;
        gaTrackUpload('to-pdf', valid.length, totalMB);
      }
    });
  };

  window.ipdfAddMore = function() { fileInput.click(); };

  window.ipdfClearQueue = function() {
    state.objectURLs.forEach(u => { try { URL.revokeObjectURL(u); } catch(e){} });
    state.objectURLs = [];
    state.images = [];
    state.curPage = 0;
    state.pdfDoc = null;
    state.converting = false;
    renderQueue();
    updateUI();
    progressWrap.hidden = true;
    downloadWrap.hidden = true;
  };

  /* ═══════════════════════════════════════════════════════════
     Queue rendering with drag reorder
  ════════════════════════════════════════════════════════════ */
  function renderQueue() {
    if (!queue) return;
    queue.innerHTML = '';
    state.images.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'itb-pdf-queue__item';
      div.draggable = true;
      div.dataset.idx = idx;
      div.innerHTML = `
        <img src="${item.url}" alt="img ${idx+1}" loading="lazy">
        <span class="itb-pdf-queue__num">${idx + 1}</span>
        <button class="itb-pdf-queue__rm" onclick="ipdfRemove(${idx})" title="Remove">×</button>
        <div class="itb-pdf-queue__actions">
          <button class="itb-pdf-queue__btn" onclick="event.stopPropagation();ipdfMove(${idx},-1)" title="Move up"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg></button>
          <button class="itb-pdf-queue__btn" onclick="event.stopPropagation();ipdfMove(${idx},1)" title="Move down"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>
          <button class="itb-pdf-queue__btn" onclick="event.stopPropagation();ipdfRotate(${idx})" title="Rotate 90°"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></button>
        </div>
      `;
      div.addEventListener('dragstart', (e) => { state.dragSrcIdx = idx; div.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      div.addEventListener('dragend',   () => { div.classList.remove('dragging'); state.dragSrcIdx = null; });
      div.addEventListener('dragover',  (e) => { e.preventDefault(); });
      div.addEventListener('drop',      (e) => {
        e.preventDefault();
        if (state.dragSrcIdx !== null && state.dragSrcIdx !== idx) {
          const tmp = state.images[state.dragSrcIdx];
          state.images[state.dragSrcIdx] = state.images[idx];
          state.images[idx] = tmp;
          renderQueue();
          ipdfDrawPreview();
        }
      });
      queue.appendChild(div);
    });
    if (queueCount) queueCount.textContent = `(${state.images.length})`;
  }

  function updateUI() {
    const has = state.images.length > 0;
    if (zone) zone.style.display = has ? 'none' : 'flex';
    if (queueWrap) queueWrap.hidden = !has;
    if (settingsWrap) settingsWrap.hidden = !has;
    if (!has) {
      progressWrap.hidden = true;
      downloadWrap.hidden = true;
    }
  }

  window.ipdfRemove = function(idx) {
    const item = state.images[idx];
    if (item && item.url) { try { URL.revokeObjectURL(item.url); } catch(e){} }
    state.objectURLs = state.objectURLs.filter(u => u !== item.url);
    state.images.splice(idx, 1);
    state.curPage = Math.min(state.curPage, Math.max(0, state.images.length - 1));
    renderQueue();
    if (state.images.length === 0) {
      updateUI();
      zone.style.display = 'flex';
    } else {
      ipdfDrawPreview();
    }
  };

  window.ipdfMove = function(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= state.images.length) return;
    const tmp = state.images[idx];
    state.images[idx] = state.images[newIdx];
    state.images[newIdx] = tmp;
    renderQueue();
    ipdfDrawPreview();
  };

  window.ipdfRotate = function(idx) {
    const item = state.images[idx];
    if (!item) return;
    const canvas = document.createElement('canvas');
    canvas.width = item.naturalH;
    canvas.height = item.naturalW;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(item.img, -item.naturalW / 2, -item.naturalH / 2);
    canvas.toBlob(blob => {
      if (!blob) return;
      const newUrl = URL.createObjectURL(blob);
      state.objectURLs.push(newUrl);
      const newImg = new Image();
      newImg.onload = () => {
        item.img = newImg;
        item.url = newUrl;
        item.naturalW = newImg.naturalWidth;
        item.naturalH = newImg.naturalHeight;
        renderQueue();
        ipdfDrawPreview();
      };
      newImg.src = newUrl;
    }, 'image/jpeg', 0.95);
  };

  /* ═══════════════════════════════════════════════════════════
     Orientation control
  ════════════════════════════════════════════════════════════ */
  window.ipdfSetOrient = function(orient) {
    document.getElementById('ipdfOrientP').classList.toggle('itb-seg-btn--active', orient === 'portrait');
    document.getElementById('ipdfOrientL').classList.toggle('itb-seg-btn--active', orient === 'landscape');
    ipdfDrawPreview();
  };

  function getOrientation() {
    return document.getElementById('ipdfOrientP').classList.contains('itb-seg-btn--active') ? 'portrait' : 'landscape';
  }

  /* ═══════════════════════════════════════════════════════════
     Page Preview
  ════════════════════════════════════════════════════════════ */
  function getPageDimensions() {
    const pageSize = document.getElementById('ipdfPageSize').value;
    const orient = getOrientation();
    const sizes = {
      a4: [595.28, 841.89],
      letter: [612, 792],
      legal: [612, 1008],
      a3: [841.89, 1190.55],
      a5: [419.53, 595.28],
      fit: null
    };
    let [w, h] = sizes[pageSize] || sizes.a4;
    if (w && orient === 'landscape') [w, h] = [h, w];
    return { w, h, fit: pageSize === 'fit' };
  }

  window.ipdfDrawPreview = function() {
    const idx = state.curPage;
    if (!state.images[idx]) return;
    const margin = parseInt(document.getElementById('ipdfMargin').value) || 0;
    const fitMode = document.getElementById('ipdfFit').value;
    const { w, h, fit } = getPageDimensions();
    const img = state.images[idx].img;
    let pageW = w, pageH = h;
    if (fit) {
      const scale = 300 / 72;
      pageW = state.images[idx].naturalW / scale;
      pageH = state.images[idx].naturalH / scale;
    }
    const SCALE = 400 / pageW;
    previewCanvas.width = Math.round(pageW * SCALE);
    previewCanvas.height = Math.round(pageH * SCALE);
    pCtx.fillStyle = '#fff';
    pCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    pCtx.strokeStyle = '#ddd';
    pCtx.lineWidth = 1;
    pCtx.strokeRect(0.5, 0.5, previewCanvas.width - 1, previewCanvas.height - 1);
    const marginPx = margin * SCALE;
    const availW = previewCanvas.width - marginPx * 2;
    const availH = previewCanvas.height - marginPx * 2;
    if (fitMode === 'contain' || fit) {
      const ratio = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
      const dw = img.naturalWidth * ratio;
      const dh = img.naturalHeight * ratio;
      pCtx.drawImage(img, marginPx + (availW - dw) / 2, marginPx + (availH - dh) / 2, dw, dh);
    } else if (fitMode === 'fill') {
      pCtx.drawImage(img, marginPx, marginPx, availW, availH);
    } else {
      const ratio = Math.min(1, availW / img.naturalWidth, availH / img.naturalHeight);
      pCtx.drawImage(img, marginPx + (availW - img.naturalWidth * ratio) / 2, marginPx + (availH - img.naturalHeight * ratio) / 2, img.naturalWidth * ratio, img.naturalHeight * ratio);
    }
  };

  window.ipdfPrevPage = function() {
    if (state.curPage > 0) { state.curPage--; ipdfDrawPreview(); updatePageInfo(); }
  };
  window.ipdfNextPage = function() {
    if (state.curPage < state.images.length - 1) { state.curPage++; ipdfDrawPreview(); updatePageInfo(); }
  };
  function updatePageInfo() {
    const el = document.getElementById('ipdfPageInfo');
    if (el) el.textContent = `Page ${state.curPage + 1} / ${state.images.length}`;
  }

  /* ═══════════════════════════════════════════════════════════
     PDF Generation
  ════════════════════════════════════════════════════════════ */
  window.ipdfStartConvert = async function() {
    if (state.images.length === 0 || state.converting) return;
    if (typeof window.jspdf === 'undefined') {
      itbToast('jsPDF is loading, please wait a moment and try again.', 'warning');
      return;
    }
    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('img-pdf');
    state.converting = true;
    const { jsPDF } = window.jspdf;
    const pageSize = document.getElementById('ipdfPageSize').value;
    const orient = getOrientation();
    const margin = parseInt(document.getElementById('ipdfMargin').value) || 0;
    const fitMode = document.getElementById('ipdfFit').value;
    const quality = parseInt(document.getElementById('ipdfQuality').value) / 100;
    const onePerPage = document.getElementById('ipdfOnePerPage').checked;

    progressWrap.hidden = false;
    downloadWrap.hidden = true;
    progressBar.style.width = '0%';
    progressLabel.textContent = '0%';

    await tick();

    try {
      const paperSize = pageSize === 'fit' ? 'a4' : pageSize;
      const pdf = new jsPDF({ orientation: orient === 'landscape' ? 'l' : 'p', unit: 'pt', format: paperSize });

      for (let i = 0; i < state.images.length; i++) {
        if (i > 0 && onePerPage) pdf.addPage(paperSize, orient === 'landscape' ? 'l' : 'p');

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2;
        const item = state.images[i];
        const imgData = await getImageDataURL(item.img, quality);

        if (pageSize === 'fit') {
          const ratio = Math.min(595 / item.naturalW, 842 / item.naturalH);
          const w = item.naturalW * ratio;
          const h = item.naturalH * ratio;
          if (i > 0) pdf.addPage([w + margin * 2, h + margin * 2]);
          pdf.addImage(imgData, 'JPEG', margin, margin, w, h);
        } else if (fitMode === 'contain') {
          const ratio = Math.min(availW / item.naturalW, availH / item.naturalH);
          const dw = item.naturalW * ratio;
          const dh = item.naturalH * ratio;
          pdf.addImage(imgData, 'JPEG', margin + (availW - dw) / 2, margin + (availH - dh) / 2, dw, dh);
        } else if (fitMode === 'fill') {
          pdf.addImage(imgData, 'JPEG', margin, margin, availW, availH);
        } else {
          const ratio = Math.min(1, availW / item.naturalW, availH / item.naturalH);
          pdf.addImage(imgData, 'JPEG', margin, margin, item.naturalW * ratio, item.naturalH * ratio);
        }

        const pct = Math.round(((i + 1) / state.images.length) * 100);
        progressBar.style.width = pct + '%';
        progressLabel.textContent = pct + '%';
        await tick();
      }

      state.pdfDoc = pdf;
      const pdfBytes = pdf.output('arraybuffer');
      downloadInfo.textContent = `${state.images.length} image${state.images.length > 1 ? 's' : ''} · ${fmtBytes(pdfBytes.byteLength)}`;
      progressWrap.hidden = true;
      downloadWrap.hidden = false;

      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('img-pdf', state.images.length, Date.now() - _gaStart);
    } catch (err) {
      progressLabel.textContent = 'Error: ' + err.message;
      itbToast('PDF generation failed: ' + err.message, 'error');
      if (typeof gaTrackError === 'function') gaTrackError('to-pdf', 'pdf_gen_failed', err.message);
    } finally {
      state.converting = false;
    }
  };

  window.ipdfSave = function() {
    if (!state.pdfDoc) return;
    const name = (document.getElementById('ipdfFilename').value || 'images').replace(/\.pdf$/i, '');
    state.pdfDoc.save(name + '.pdf');
    if (typeof gaTrackDownload === 'function') gaTrackDownload('img-pdf', 'application/pdf');
  };

  window.ipdfReset = function() {
    state.objectURLs.forEach(u => { try { URL.revokeObjectURL(u); } catch(e){} });
    state.objectURLs = [];
    state.images = [];
    state.curPage = 0;
    state.pdfDoc = null;
    state.converting = false;
    renderQueue();
    updateUI();
    progressWrap.hidden = true;
    downloadWrap.hidden = true;
    fileInput.value = '';
  };

  /* ═══════════════════════════════════════════════════════════
     Helpers
  ════════════════════════════════════════════════════════════ */
  function getImageDataURL(img, quality) {
    return new Promise(resolve => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c.toDataURL('image/jpeg', quality));
    });
  }

  function tick() { return new Promise(r => setTimeout(r, 0)); }
  function fmtBytes(n) {
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

})();
