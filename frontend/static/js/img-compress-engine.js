/* ═══════════════════════════════════════════════
   Image Compress Engine - Block I-03
   纯前端压缩引擎（Canvas + browser-image-compression）
═══════════════════════════════════════════════ */

'use strict';

console.log('🔧 Image Compress Engine - Block I-03 loaded');

/* ═══════════════════════════════════════════════
   全局状态
═══════════════════════════════════════════════ */
const ICState = {
  files:       [],    // 原始 File 对象数组
  results:     [],    // 压缩结果数组
  isRunning:   false, // 是否正在压缩
  quality:     80,    // 当前质量 20~100
  outputFormat:'original', // 输出格式
  maxWidth:    null,  // 最大宽度（null = 不限制）
};

const IC_MAX_FILES   = 20;
const IC_MAX_SIZE_MB = 100;  // 纯前端 Canvas 处理，现代浏览器可处理 100MB 以内图片
const IC_CONCURRENCY = 4; // 并发压缩数

/* ═══════════════════════════════════════════════
   文件入口：校验 + 去重 + 入队
═══════════════════════════════════════════════ */
function addFiles(fileList) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
  let added = 0;

  for (const file of Array.from(fileList)) {
    // 数量上限
    if (ICState.files.length >= IC_MAX_FILES) {
      showToast(`Max ${IC_MAX_FILES} images at once`, 'error');
      break;
    }

    // Format check
    if (!allowed.includes(file.type)) {
      showToast(`${file.name}: unsupported format`, 'error');
      continue;
    }

    // Size check
    if (file.size > IC_MAX_SIZE_MB * 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      showToast(`${file.name} (${fileSizeMB}MB) exceeds ${IC_MAX_SIZE_MB}MB limit`, 'error');
      showUploadZoneError(`File too large: ${file.name} is ${fileSizeMB}MB (max ${IC_MAX_SIZE_MB}MB)`);
      continue;
    }

    // 去重（按文件名+大小）
    const key = `${file.name}-${file.size}`;
    if (ICState.files.some(f => `${f.name}-${f.size}` === key)) continue;

    // 生成唯一 id
    file._icId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    ICState.files.push(file);
    added++;
  }

  if (added > 0) onFilesAdded();
}

/* ═══════════════════════════════════════════════
   主压缩流程
═══════════════════════════════════════════════ */
async function startCompress() {
  if (ICState.files.length === 0 || ICState.isRunning) return;
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('img-compress-engine');
  ICState.isRunning = true;

  // 读取当前选项
  ICState.quality      = parseInt(document.getElementById('qualitySlider')?.value || 80);
  // Support both radio buttons and <select id="outputFormat">
  var _radioFmt = document.querySelector('input[name="outputFormat"]:checked');
  var _selectFmt = document.getElementById('outputFormat');
  if (_radioFmt) {
    ICState.outputFormat = _radioFmt.value || 'original';
  } else if (_selectFmt) {
    var _sv = _selectFmt.value;
    ICState.outputFormat =
      _sv === 'auto'  ? 'original'   :
      _sv === 'jpg'   ? 'image/jpeg' :
      _sv === 'png'   ? 'image/png'  :
      _sv === 'webp'  ? 'image/webp' :
      _sv === 'gif'   ? 'image/gif'  :
      _sv === 'bmp'   ? 'image/bmp'  :
      _sv === 'tiff'  ? 'image/tiff' : 'original';
  }
  // else: keep whatever was already set in ICState.outputFormat
  ICState.maxWidth     = parseInt(document.getElementById('maxWidth')?.value) || null;

  // 找出尚未压缩的文件
  const pending = ICState.files.filter(f =>
    !ICState.results.find(r => r.id === f._icId)
  );

  if (pending.length === 0) {
    ICState.isRunning = false;
    showToast('All files already processed', 'success');
    return;
  }

  // 更新 UI
  setCompressBtnState('running');
  showResultsSection();

  // 先为所有待处理文件插入「处理中」占位卡片
  for (const file of pending) {
    upsertResultCard({
      id:       file._icId,
      name:     file.name,
      origName: file.name,
      origSize: file.size,
      origType: file.type,
      status:   'compressing',
      origUrl:  URL.createObjectURL(file),
    });
  }

  // 并发处理（限制 IC_CONCURRENCY 个同时执行）
  await runConcurrent(pending, IC_CONCURRENCY, async (file) => {
    try {
      const result = await compressOne(file);
      ICState.results.push(result);
      upsertResultCard(result);
    } catch (err) {
      console.error('Compression failed:', file.name, err);
      upsertResultCard({
        id:       file._icId,
        name:     file.name,
        origSize: file.size,
        origType: file.type,
        status:   'error',
        error:    err.message,
      });
    }
  });

  ICState.isRunning = false;
  setCompressBtnState('idle');
  updateSummaryStats();
  showToast(`Compressed ${ICState.results.filter(r => r.status === 'done').length} image(s) successfully`, 'success');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('img-compress-engine', ICState.results.filter(r => r.status === 'done').length, Date.now() - _gaStart);
}

/* ═══════════════════════════════════════════════
   单张图片压缩核心
═══════════════════════════════════════════════ */
async function compressOne(file) {
  const quality      = ICState.quality / 100;
  const outputFormat = ICState.outputFormat;
  const maxWidth     = ICState.maxWidth;

  // Determine final output MIME
  let targetMime = file.type;
  if (outputFormat !== 'original') targetMime = outputFormat;

  let formatWarning = null;

  // Normalise unsupported formats for Canvas.toBlob
  // Canvas.toBlob does not support image/bmp or image/gif in any major browser.
  // If user explicitly chose these formats, we convert and show a warning.
  if (targetMime === 'image/bmp') {
    targetMime = 'image/jpeg';
    if (outputFormat !== 'original') formatWarning = 'BMP output is not supported — saved as JPEG instead';
  }
  if (targetMime === 'image/gif') {
    targetMime = 'image/png';
    if (outputFormat !== 'original') formatWarning = 'GIF output is not supported — saved as PNG instead';
  }
  if (targetMime === 'image/tiff') {
    targetMime = 'image/jpeg';
    if (outputFormat !== 'original') formatWarning = 'TIFF output is not supported — saved as JPEG instead';
  }

  // Use browser-image-compression for PNG-to-PNG (lossy)
  if (targetMime === 'image/png' && outputFormat === 'original' && quality < 0.85) {
    return await compressPNG(file, quality, maxWidth, targetMime, formatWarning);
  }
  // All other cases: Canvas
  return await compressViaCanvas(file, quality, maxWidth, targetMime, formatWarning);
}

/* ── Canvas 压缩（JPEG / WebP / 格式转换）──── */
async function compressViaCanvas(file, quality, maxWidth, targetMime, formatWarning) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算目标尺寸
      let { width, height } = img;
      if (maxWidth && width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width  = maxWidth;
      }

      // 绘制到 Canvas
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');

      // JPEG 不支持透明背景，PNG/WebP 转 JPG 时需要白底
      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // 导出为目标格式（浏览器不支持的格式会静默 fallback 到 PNG）
      const q = targetMime === 'image/png' ? undefined : quality;
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return; }

        // 浏览器可能 fallback 到 PNG，用 blob.type 作为实际输出 MIME
        const actualMime = blob.type || targetMime;
        const ext     = mimeToExt(actualMime);
        const outName = replaceExt(file.name, ext);

        if (formatWarning) showToast(formatWarning, 'warning');

        resolve({
          id:         file._icId,
          name:       outName,
          origName:   file.name,
          origSize:   file.size,
          origType:   file.type,
          outputBlob: blob,
          outputSize: blob.size,
          outputMime: actualMime,
          width,
          height,
          status:     'done',
          savedBytes: file.size - blob.size,
          savedPct:   Math.max(0, Math.round((1 - blob.size / file.size) * 100)),
          previewUrl: URL.createObjectURL(blob),
          origUrl:    URL.createObjectURL(file),
        });
      }, targetMime, q);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed — file may be corrupt'));
    };

    img.src = url;
  });
}

/* ── browser-image-compression（PNG 有损）─── */
async function compressPNG(file, quality, maxWidth, targetMime, formatWarning) {
  if (typeof imageCompression === 'undefined') {
    console.warn('browser-image-compression not loaded — falling back to Canvas');
    return await compressViaCanvas(file, quality, maxWidth, targetMime, formatWarning);
  }

  const options = {
    maxSizeMB:          (file.size / (1024 * 1024)) * (1 - quality * 0.6),
    maxWidthOrHeight:   maxWidth || 99999,
    useWebWorker:       true,
    fileType:           targetMime,
    onProgress:         () => {},  // 可接 UI 进度
  };

  // quality 大于 0.85 时直接用 Canvas
  if (quality > 0.85) {
    options.maxSizeMB = file.size / (1024 * 1024) * 0.9;
  }

  const compressed = await imageCompression(file, options);

  const actualMime = compressed.type || targetMime;
  const ext     = mimeToExt(actualMime);
  const outName = replaceExt(file.name, ext);

  if (formatWarning) showToast(formatWarning, 'warning');

  return {
    id:         file._icId,
    name:       outName,
    origName:   file.name,
    origSize:   file.size,
    origType:   file.type,
    outputBlob: compressed,
    outputSize: compressed.size,
    outputMime: actualMime,
    width:      null,
    height:     null,
    status:     'done',
    savedBytes: file.size - compressed.size,
    savedPct:   Math.max(0, Math.round((1 - compressed.size / file.size) * 100)),
    previewUrl: URL.createObjectURL(compressed),
    origUrl:    URL.createObjectURL(file),
  };
}

/* ═══════════════════════════════════════════════
   并发控制工具
═══════════════════════════════════════════════ */
async function runConcurrent(items, concurrency, fn) {
  const queue   = [...items];
  const workers = [];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) await fn(item);
    }
  }

  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

/* ═══════════════════════════════════════════════
   单张下载
═══════════════════════════════════════════════ */
function downloadOne(id) {
  const result = ICState.results.find(r => r.id === id);
  if (!result || !result.outputBlob) return;
  if (typeof gaTrackDownload === 'function') gaTrackDownload('img-compress-engine', result.outputMime || 'image/jpeg');

  if (typeof saveAs !== 'undefined') {
    saveAs(result.outputBlob, result.name);
  } else {
    // Fallback: 使用 a 标签下载
    const url = URL.createObjectURL(result.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/* ═══════════════════════════════════════════════
   全部打包 ZIP 下载
═══════════════════════════════════════════════ */
async function downloadAll() {
  const doneResults = ICState.results.filter(r => r.status === 'done' && r.outputBlob);
  if (doneResults.length === 0) {
    showToast('No compressed images to download', 'info');
    return;
  }

  if (typeof JSZip === 'undefined') {
    showToast('JSZip not loaded — cannot create ZIP', 'error');
    return;
  }

  const btn = document.getElementById('downloadAllBtn');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Packing…';
  }

  try {
    const zip = new JSZip();
    const folder = zip.folder('compressed-images');

    for (const result of doneResults) {
      folder.file(result.name, result.outputBlob);
    }

    const zipBlob = await zip.generateAsync({
      type:               'blob',
      compression:        'DEFLATE',
      compressionOptions: { level: 1 },
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const zipName = `compressed-images-${timestamp}.zip`;

    if (typeof saveAs !== 'undefined') {
      saveAs(zipBlob, zipName);
    } else {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    if (typeof gaTrackDownload === 'function') gaTrackDownload('img-compress-engine', 'application/zip');
    showToast(`Downloaded ${doneResults.length} image(s) as ZIP`, 'success');
  } catch (err) {
    console.error('ZIP error:', err);
    showToast('ZIP failed: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

/* ═══════════════════════════════════════════════
   工具函数
═══════════════════════════════════════════════ */
function mimeToExt(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
    'image/bmp':  'bmp',
    'image/tiff': 'tiff',
  };
  return map[mime] || 'jpg';
}

function replaceExt(filename, newExt) {
  const dotIdx = filename.lastIndexOf('.');
  const base   = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  return `${base}.${newExt}`;
}

function formatFileSize(bytes) {
  if (bytes === 0)          return '0 B';
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setCompressBtnState(state) {
  const btn  = document.getElementById('compressBtn');
  const text = document.getElementById('compressBtnText');
  if (!btn) return;

  if (state === 'running') {
    btn.disabled     = true;
    if (text) text.textContent = 'Compressing…';
  } else {
    btn.disabled     = false;
    if (text) text.textContent = 'Compress';
  }
}

function updateSummaryStats() {
  const done      = ICState.results.filter(r => r.status === 'done');
  const totalOrig = done.reduce((s, r) => s + r.origSize, 0);
  const totalOut  = done.reduce((s, r) => s + r.outputSize, 0);
  const savedPct  = totalOrig > 0
    ? Math.round((1 - totalOut / totalOrig) * 100) : 0;

  const headerEl = document.getElementById('resultsHeader');
  if (!headerEl) return;

  if (done.length === 0) { headerEl.innerHTML = ''; return; }

  // savedPct > 0 means saved, savedPct < 0 means grew
  const isGrew = savedPct < 0;
  const pctVal = Math.abs(savedPct);
  const badgeClass = isGrew ? 'ic-savings-badge--grew' : '';
  const badgeSymbol = isGrew ? '+' : '-';

  headerEl.innerHTML = `
    <span class="ic-results-stat">${done.length} image${done.length !== 1 ? 's' : ''} compressed</span>
    <span style="color:#94a3b8">·</span>
    <span>${formatFileSize(totalOrig)} → <strong>${formatFileSize(totalOut)}</strong></span>
    <span style="color:#94a3b8">·</span>
    <span class="ic-savings-badge ${badgeClass}">${badgeSymbol}${pctVal}%</span>
  `;
}

console.log('✅ Image Compress Engine initialized');

