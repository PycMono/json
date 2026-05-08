/**
 * img-video.js — Images to Video (Canvas + MediaRecorder API)
 * Renders each image onto a Canvas, records via MediaRecorder, downloads WebM/MP4
 */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────
  let images = [];          // { id, file, img, url }
  let dragSrcIdx = null;
  let previewInterval = null;
  let previewIdx = 0;
  let videoBlob = null;

  const zone      = document.getElementById('itvUploadZone');
  const fileInput = document.getElementById('itvFileInput');
  const gridWrap  = document.getElementById('itvGridWrap');
  const grid      = document.getElementById('itvGrid');
  const settingsRow = document.getElementById('itvSettingsRow');
  const canvas    = document.getElementById('itvPreviewCanvas');
  const ctx       = canvas.getContext('2d');
  const makeBtn   = document.getElementById('itvMakeBtn');
  const progressWrap = document.getElementById('itvProgressWrap');
  const progressBar  = document.getElementById('itvProgressBar');
  const progressLabel = document.getElementById('itvProgressLabel');
  const downloadWrap = document.getElementById('itvDownloadWrap');
  const downloadLink = document.getElementById('itvDownloadLink');
  const downloadInfo = document.getElementById('itvDownloadInfo');

  // ── Upload ────────────────────────────────────
  fileInput.addEventListener('change', (e) => addFiles(Array.from(e.target.files)));
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
  });
  document.getElementById('itvUploadIdle').addEventListener('click', () => fileInput.click());

  function addFiles(files) {
    const promises = files.map(f => new Promise(resolve => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload  = () => resolve({ id: Date.now() + Math.random(), file: f, img, url });
      img.onerror = () => resolve(null);
      img.src = url;
    }));

    Promise.all(promises).then(results => {
      images.push(...results.filter(Boolean));
      renderGrid();
      updateUI();
      drawPreviewFrame(0);
    });
  }

  // ── Grid ──────────────────────────────────────
  function renderGrid() {
    grid.innerHTML = '';
    images.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'itv-grid-item';
      div.draggable = true;
      div.dataset.idx = idx;
      div.innerHTML = `
        <img src="${item.url}" alt="img ${idx+1}" loading="lazy">
        <button class="itv-grid-item__remove" onclick="itvRemove(${idx})" title="Remove">×</button>
        <span class="itv-grid-item__num">${idx + 1}</span>
      `;
      div.addEventListener('dragstart', (e) => { dragSrcIdx = idx; div.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      div.addEventListener('dragend',   () => { div.classList.remove('dragging'); dragSrcIdx = null; });
      div.addEventListener('dragover',  (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      div.addEventListener('drop',      (e) => { e.preventDefault(); if (dragSrcIdx !== null && dragSrcIdx !== idx) {
        const tmp = images[dragSrcIdx]; images[dragSrcIdx] = images[idx]; images[idx] = tmp;
        renderGrid(); drawPreviewFrame(0);
      }});
      grid.appendChild(div);
    });
    document.getElementById('itvImgCount').textContent = `(${images.length})`;
  }

  function updateUI() {
    const hasImages = images.length > 0;
    zone.style.display   = hasImages ? 'none'  : 'block';
    gridWrap.style.display  = hasImages ? 'block' : 'none';
    settingsRow.style.display = hasImages ? 'grid'  : 'none';
  }

  window.itvRemove = function(idx) {
    URL.revokeObjectURL(images[idx].url);
    images.splice(idx, 1);
    renderGrid();
    if (images.length === 0) updateUI();
    else drawPreviewFrame(0);
  };

  window.itvClearAll = function() {
    images.forEach(i => URL.revokeObjectURL(i.url));
    images = [];
    renderGrid();
    updateUI();
  };

  window.itvAddMore = function() { fileInput.click(); };

  // ── Preview Slideshow ──────────────────────────
  function getResolution() {
    return parseInt(document.getElementById('itvResolution').value) || 720;
  }

  function drawPreviewFrame(idx) {
    if (!images[idx]) return;
    const res = getResolution();
    canvas.width  = Math.round(res * 16 / 9);
    canvas.height = res;
    const img = images[idx].img;
    const ratio = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * ratio;
    const h = img.naturalHeight * ratio;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    document.getElementById('itvPreviewFrame').textContent = `Frame ${idx + 1} / ${images.length}`;
    document.getElementById('itvPreviewPlaceholder').style.display = 'none';
    canvas.style.display = 'block';
  }

  window.itvPreviewSlideshow = function() {
    if (images.length === 0) return;
    if (previewInterval) { clearInterval(previewInterval); previewInterval = null; return; }
    previewIdx = 0;
    previewInterval = setInterval(() => {
      drawPreviewFrame(previewIdx);
      previewIdx = (previewIdx + 1) % images.length;
    }, parseFloat(document.getElementById('itvDuration').value) * 1000);
  };

  // ── Settings Labels ────────────────────────────
  window.itvUpdateDurationLabel = function() {
    const v = parseFloat(document.getElementById('itvDuration').value);
    document.getElementById('itvDurationLabel').textContent = v + 's';
  };
  window.itvUpdateTransLabel = function() {
    const v = parseFloat(document.getElementById('itvTransDuration').value);
    document.getElementById('itvTransLabel').textContent = v + 's';
  };

  // ── Video Rendering ────────────────────────────
  window.startVideoMake = async function() {
    if (images.length === 0) return;
    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('img-video');
    if (previewInterval) { clearInterval(previewInterval); previewInterval = null; }

    const fps          = parseInt(document.getElementById('itvFPS').value);
    const duration     = parseFloat(document.getElementById('itvDuration').value);
    const transition   = document.getElementById('itvTransition').value;
    const transDur     = parseFloat(document.getElementById('itvTransDuration').value);
    const res          = getResolution();
    const format       = document.getElementById('itvFormat').value;

    const cw = Math.round(res * 16 / 9);
    const ch = res;
    canvas.width  = cw;
    canvas.height = ch;

    const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm;codecs=vp9';
    const fallback = 'video/webm';
    const mime = MediaRecorder.isTypeSupported(mimeType) ? mimeType : fallback;

    const stream   = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: res >= 1080 ? 8000000 : 4000000 });
    const chunks   = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      videoBlob = new Blob(chunks, { type: mime });
      const url  = URL.createObjectURL(videoBlob);
      const ext  = mime.includes('mp4') ? 'mp4' : 'webm';
      downloadLink.href     = url;
      downloadLink.download = `slideshow.${ext}`;
      downloadInfo.textContent = `${images.length} images · ${formatTime(images.length * duration)} · ${formatBytes(videoBlob.size)}`;
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('img-video', 1, Date.now() - _gaStart);
      progressWrap.style.display  = 'none';
      downloadWrap.style.display  = 'block';
    };

    makeBtn.disabled = true;
    progressWrap.style.display = 'block';
    downloadWrap.style.display = 'none';
    progressBar.style.width = '0%';

    recorder.start(100);

    const transFrames = Math.round(transDur * fps);
    const holdFrames  = Math.round((duration - transDur) * fps);
    const totalFrames = images.length * (holdFrames + transFrames);
    let   framesDone  = 0;

    for (let i = 0; i < images.length; i++) {
      const cur  = images[i];
      const next = images[(i + 1) % images.length];

      // Hold frame
      for (let f = 0; f < holdFrames; f++) {
        drawImage(cur.img, cw, ch);
        await nextFrame(fps);
        framesDone++;
        progressBar.style.width = Math.round((framesDone / totalFrames) * 100) + '%';
        progressLabel.textContent = `Rendering… ${Math.round((framesDone / totalFrames) * 100)}%`;
      }

      // Transition
      if (i < images.length - 1) {
        for (let t = 0; t < transFrames; t++) {
          const progress = t / transFrames;
          renderTransition(transition, cur.img, next.img, progress, cw, ch);
          await nextFrame(fps);
          framesDone++;
          progressBar.style.width = Math.round((framesDone / totalFrames) * 100) + '%';
        }
      }
    }

    recorder.stop();
    makeBtn.disabled = false;
  };

  function drawImage(img, cw, ch) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    const ratio = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * ratio;
    const h = img.naturalHeight * ratio;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function renderTransition(type, imgA, imgB, progress, cw, ch) {
    switch (type) {
      case 'fade':
        drawImage(imgA, cw, ch);
        ctx.globalAlpha = progress;
        drawImage(imgB, cw, ch);
        ctx.globalAlpha = 1;
        break;
      case 'slide': {
        const offset = Math.round(progress * cw);
        ctx.save();
        ctx.translate(-offset, 0);
        drawImage(imgA, cw, ch);
        ctx.translate(cw, 0);
        drawImage(imgB, cw, ch);
        ctx.restore();
        break;
      }
      case 'zoom': {
        drawImage(imgA, cw, ch);
        const scale = 1 + progress * 0.1;
        ctx.save();
        ctx.globalAlpha = progress;
        ctx.translate(cw / 2, ch / 2);
        ctx.scale(scale, scale);
        ctx.translate(-cw / 2, -ch / 2);
        drawImage(imgB, cw, ch);
        ctx.restore();
        ctx.globalAlpha = 1;
        break;
      }
      default:
        drawImage(imgB, cw, ch);
    }
  }

  function nextFrame(fps) {
    return new Promise(resolve => setTimeout(resolve, 1000 / fps));
  }

  window.itvReset = function() {
    images.forEach(i => URL.revokeObjectURL(i.url));
    images = [];
    videoBlob = null;
    renderGrid();
    updateUI();
    zone.style.display = 'block';
    downloadWrap.style.display = 'none';
    progressWrap.style.display = 'none';
    fileInput.value = '';
  };

  // ── Helpers ──────────────────────────────────
  function formatBytes(n) {
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function formatTime(s) {
    const m = Math.floor(s / 60); const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }

})();

