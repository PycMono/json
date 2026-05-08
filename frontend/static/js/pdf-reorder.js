/**
 * pdf-reorder.js — PDF Page Reorder
 * Uses pdf-lib to reorder pages, PDF.js for thumbnail rendering
 */
(function () {
  'use strict';

  const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  let pdfBytes = null;      // original ArrayBuffer
  let pageOrder = [];       // [0-based] current page order
  let pdfDoc = null;        // PDF.js document for thumbnails
  let dragSrcIdx = null;

  const zone = document.getElementById('reorderUploadZone');
  const fileInput = document.getElementById('reorderFileInput');

  // Bootstrap PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN;

  // ── Upload ─────────────────────────────────────
  fileInput.addEventListener('change', e => { if (e.target.files[0]) loadPDF(e.target.files[0]); });
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') loadPDF(f);
  });
  zone.querySelector('.pdf-upload-idle').addEventListener('click', () => fileInput.click());

  async function loadPDF(file) {
    showEl('reorderLoading');
    hideEl('reorderUploadZone');

    try {
      const buf = await file.arrayBuffer();
      pdfBytes = buf.slice(0);

      pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      const n = pdfDoc.numPages;
      pageOrder = Array.from({ length: n }, (_, i) => i);

      document.getElementById('reorderFileName').textContent = file.name;
      document.getElementById('reorderFileMeta').textContent = `${n} pages · ${fmtBytes(file.size)}`;
      showEl('reorderFileCard');
      document.getElementById('reorderPageCount').textContent = `(${n})`;

      await renderThumbs();

      hideEl('reorderLoading');
      showEl('reorderGrid');
    } catch (err) {
      showError('reorderLoading', 'Could not read PDF: ' + err.message);
    }
  }

  async function renderThumbs() {
    const grid = document.getElementById('reorderThumbGrid');
    grid.innerHTML = '';
    for (let i = 0; i < pageOrder.length; i++) {
      const pageNum = pageOrder[i] + 1;
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      const div = document.createElement('div');
      div.className = 'pdf-thumb-item';
      div.draggable = true;
      div.dataset.idx = i;
      div.appendChild(canvas);
      div.innerHTML += `<span class="pdf-thumb-item__num">Page ${pageOrder[i] + 1}</span>
                        <button class="pdf-thumb-item__remove" onclick="reorderRemovePage(${i})">×</button>`;

      div.addEventListener('dragstart', e => { dragSrcIdx = i; div.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      div.addEventListener('dragend',   () => { div.classList.remove('dragging'); dragSrcIdx = null; });
      div.addEventListener('dragover',  e => { e.preventDefault(); div.classList.add('drag-over-target'); });
      div.addEventListener('dragleave', () => div.classList.remove('drag-over-target'));
      div.addEventListener('drop',      e => {
        e.preventDefault(); div.classList.remove('drag-over-target');
        if (dragSrcIdx !== null && dragSrcIdx !== i) {
          const tmp = pageOrder[dragSrcIdx]; pageOrder[dragSrcIdx] = pageOrder[i]; pageOrder[i] = tmp;
          renderThumbs();
        }
      });
      grid.appendChild(div);
    }
  }

  window.reorderRemovePage = function (idx) {
    pageOrder.splice(idx, 1);
    document.getElementById('reorderPageCount').textContent = `(${pageOrder.length})`;
    renderThumbs();
  };

  window.reorderReverse = function () { pageOrder.reverse(); renderThumbs(); };

  window.reorderDownload = async function () {
    const { PDFDocument } = PDFLib;
    showEl('reorderProgress');

    try {
      const srcDoc = await PDFDocument.load(pdfBytes);
      const newDoc = await PDFDocument.create();
      const total = pageOrder.length;

      for (let i = 0; i < total; i++) {
        const [copied] = await newDoc.copyPages(srcDoc, [pageOrder[i]]);
        newDoc.addPage(copied);
        setProgress('reorderProgressBar', 'reorderProgressLabel', i + 1, total, 'Building PDF');
        await tick();
      }

      const out = await newDoc.save();
      const blob = new Blob([out], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      document.getElementById('reorderDownloadLink').href = url;
      document.getElementById('reorderDownloadLink').download = 'reordered.pdf';
      document.getElementById('reorderDownloadInfo').textContent = `${total} pages · ${fmtBytes(out.byteLength)}`;
      document.getElementById('reorderDownloadLink').addEventListener('click', function () {
        if (typeof gaTrackDownload === 'function') gaTrackDownload('pdf-reorder', 'application/pdf');
      });

      hideEl('reorderProgress');
      showEl('reorderDownload');
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('pdf-reorder', total, 0);
    } catch (err) {
      showError('reorderProgress', 'Error: ' + err.message);
      if (typeof gaTrackError === 'function') gaTrackError('pdf-reorder', 'reorder_failed', err.message);
    }
  };

  window.reorderReset = function () {
    pdfBytes = null; pageOrder = []; pdfDoc = null;
    ['reorderFileCard','reorderGrid','reorderLoading','reorderProgress','reorderDownload'].forEach(hideEl);
    showEl('reorderUploadZone');
    fileInput.value = '';
  };

  // ── Helpers ──────────────────────────────────
  function showEl(id) { const e = document.getElementById(id); if (e) e.style.display = ''; }
  function hideEl(id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  function tick() { return new Promise(r => setTimeout(r, 0)); }
  function fmtBytes(n) { return n < 1048576 ? (n/1024).toFixed(0)+' KB' : (n/1048576).toFixed(2)+' MB'; }
  function setProgress(barId, lblId, done, total, label) {
    document.getElementById(barId).style.width = Math.round(done/total*100)+'%';
    document.getElementById(lblId).textContent = `${label} ${done}/${total}…`;
  }
  function showError(containerId, msg) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<p class="pdf-error">${msg}</p>`;
    el.style.display = '';
  }
})();

