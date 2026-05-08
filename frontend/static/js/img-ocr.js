/**
 * img-ocr.js — Image to Text (OCR) tool
 * Uses backend proxy /api/img/ocr which calls OCR.space API (key stored server-side)
 */

(function () {
  'use strict';

  const zone      = document.getElementById('ocrUploadZone');
  const fileInput = document.getElementById('ocrFileInput');
  const runBtn    = document.getElementById('ocrRunBtn');
  const output    = document.getElementById('ocrOutput');
  const status    = document.getElementById('ocrStatus');
  const loading   = document.getElementById('ocrLoading');
  const confidence = document.getElementById('ocrConfidence');
  const confBar   = document.getElementById('ocrConfidenceBar');
  const confPct   = document.getElementById('ocrConfidencePct');
  const stats     = document.getElementById('ocrStats');
  const wordCount = document.getElementById('ocrWordCount');
  const charCount = document.getElementById('ocrCharCount');
  const copyBtn   = document.getElementById('ocrCopyBtn');
  const dlBtn     = document.getElementById('ocrDownloadBtn');
  const clrBtn    = document.getElementById('ocrClearBtn');
  const previewWrap = document.getElementById('ocrPreviewWrap');
  const previewImg  = document.getElementById('ocrPreviewImg');
  const previewInfo = document.getElementById('ocrPreviewInfo');
  const uploadIdle  = document.getElementById('ocrUploadIdle');
  const dropOverlay = document.getElementById('ocrDropOverlay');

  let currentFile = null;
  let currentBase64 = null;
  let currentMime = 'image/jpeg';

  // ── File Handling ─────────────────────────────
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) loadFile(e.target.files[0]);
  });

  // Drag & Drop
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  });

  // Click to upload (clicking idle area)
  uploadIdle.addEventListener('click', () => fileInput.click());

  function loadFile(file) {
    currentFile = file;
    currentMime = file.type || 'image/jpeg';

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataURL = e.target.result;
      // Strip the data URI prefix to get pure base64
      currentBase64 = dataURL.split(',')[1];

      // Show preview
      previewImg.src = dataURL;
      previewInfo.textContent = `${file.name} · ${formatBytes(file.size)}`;
      uploadIdle.style.display = 'none';
      previewWrap.style.display = 'block';
      runBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  // ── OCR Run ───────────────────────────────────
  window.runOCR = async function () {
    if (!currentBase64) return;
    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('img-ocr');

    const lang   = document.getElementById('ocrLang').value;
    const engine = document.getElementById('ocrEngine').value;

    // Switch to loading state
    status.style.display  = 'none';
    loading.style.display = 'flex';
    output.style.display  = 'none';
    confidence.style.display = 'none';
    stats.style.display   = 'none';
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Recognizing…';

    try {
      const res = await fetch('/api/img/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: currentBase64,
          mime_type: currentMime,
          lang: lang,
          engine: engine
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'OCR failed. Please try again.');
        if (typeof gaTrackError === 'function') gaTrackError('img-ocr', 'ocr_api_error', data.error || 'OCR failed');
        return;
      }

      showResult(data.text || '', data.confidence || 0);
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('img-ocr', 1, Date.now() - _gaStart);

    } catch (err) {
      showError('Network error: ' + err.message);
      if (typeof gaTrackError === 'function') gaTrackError('img-ocr', 'ocr_failed', err.message);
    } finally {
      loading.style.display = 'none';
      runBtn.disabled = false;
      runBtn.innerHTML = '<span class="ocr-run-icon">🔍</span> Extract Text';
    }
  };

  function showResult(text, conf) {
    output.value = text;
    output.style.display = 'block';

    // Confidence
    const pct = Math.round(conf);
    confBar.style.width = pct + '%';
    confPct.textContent = pct + '%';
    // Color by confidence level
    const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
    confBar.style.background = color;
    confPct.style.color = color;
    confidence.style.display = 'flex';

    // Word / char count
    updateStats(text);
    stats.style.display = 'flex';

    // Enable action buttons
    copyBtn.disabled = false;
    dlBtn.disabled   = false;
    clrBtn.disabled  = false;
  }

  function showError(msg) {
    loading.style.display = 'none';
    status.innerHTML = `<div style="color:#dc2626;padding:16px;background:#fef2f2;border-radius:10px;border:1px solid #fecaca">${msg}</div>`;
    status.style.display = 'block';
  }

  function updateStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    charCount.textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
  }

  // Live word/char count as user edits
  output.addEventListener('input', () => updateStats(output.value));

  // ── Actions ──────────────────────────────────
  window.ocrCopy = async function () {
    try {
      await navigator.clipboard.writeText(output.value);
      copyBtn.textContent = '✅ Copied!';
      setTimeout(() => { copyBtn.innerHTML = '<span>📋</span> Copy'; }, 2000);
      if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('img-ocr', 'text');
    } catch {
      // fallback
      output.select();
      document.execCommand('copy');
    }
  };

  window.ocrDownload = function () {
    if (typeof gaTrackDownload === 'function') gaTrackDownload('img-ocr', 'text/plain');
    const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'ocr-result.txt' });
    a.click();
    URL.revokeObjectURL(url);
  };

  window.ocrClear = function () {
    output.value = '';
    output.style.display = 'none';
    confidence.style.display = 'none';
    stats.style.display = 'none';
    status.style.display = 'block';
    copyBtn.disabled = dlBtn.disabled = clrBtn.disabled = true;
  };

  window.ocrChangeImage = function () {
    currentFile = currentBase64 = null;
    uploadIdle.style.display = 'block';
    previewWrap.style.display = 'none';
    runBtn.disabled = true;
    fileInput.value = '';
  };

  // ── Helpers ──────────────────────────────────
  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  // Paste from clipboard
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) loadFile(file);
        break;
      }
    }
  });

})();

