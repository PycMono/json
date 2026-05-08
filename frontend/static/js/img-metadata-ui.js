/**
 * img-metadata-ui.js
 * UI 交互层：拖拽上传、文件列表、元数据卡片渲染、GPS 地图、字段复制、导出
 * 依赖：img-metadata-engine.js（IMState、addFiles、exportData、exportAll、clearAll）
 */
'use strict';

/* ══════════════════════════════════════════════
   上传区初始化
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;

  zone.addEventListener('dragover', function (e) {
    e.preventDefault(); e.stopPropagation();
    zone.classList.add('im-upload-zone--dragover');
  });

  zone.addEventListener('dragleave', function (e) {
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('im-upload-zone--dragover');
    }
  });

  zone.addEventListener('drop', function (e) {
    e.preventDefault(); e.stopPropagation();
    zone.classList.remove('im-upload-zone--dragover');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  });

  zone.addEventListener('click', function (e) {
    if (e.target.tagName === 'LABEL' || e.target.closest('label')) return;
    const input = document.getElementById('fileInput');
    if (input) input.click();
  });

  // 粘贴上传
  document.addEventListener('paste', function (e) {
    const files = e.clipboardData.files;
    if (files.length) addFiles(files);
  });
});

/* 全局拖拽事件（inline 调用兼容） */
function onDragOver(e) {
  e.preventDefault(); e.stopPropagation();
  const zone = document.getElementById('uploadZone');
  if (zone) zone.classList.add('im-upload-zone--dragover');
}

function onDragLeave(e) {
  const zone = document.getElementById('uploadZone');
  if (zone && !zone.contains(e.relatedTarget)) {
    zone.classList.remove('im-upload-zone--dragover');
  }
}

function onDrop(e) {
  e.preventDefault(); e.stopPropagation();
  const zone = document.getElementById('uploadZone');
  if (zone) zone.classList.remove('im-upload-zone--dragover');
  if (e.dataTransfer && e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
}

function onFileSelect(input) {
  if (input.files && input.files.length > 0) { addFiles(input.files); input.value = ''; }
}

/* ── 显示结果区 ────────────────────────────── */
function showResultsSection() {
  const sec = document.getElementById('resultsSection');
  if (sec) {
    sec.style.display = 'block';
    setTimeout(function () { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
  }
  const bulk = document.getElementById('bulkExport');
  if (bulk) bulk.style.display = 'flex';
}

/* ══════════════════════════════════════════════
   文件列表
════════════════════════════════════════════════ */
function addFileItem(file, status) {
  const list = document.getElementById('fileList');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'im-file-item';
  item.id        = 'im-file-item-' + file._imId;
  item.onclick   = function () { selectFile(file._imId); };

  const thumbUrl = URL.createObjectURL(file);
  item.innerHTML =
    '<img class="im-file-item__thumb" src="' + thumbUrl + '"' +
    ' onload="URL.revokeObjectURL(this.src)" alt="">' +
    '<div class="im-file-item__info">' +
      '<p class="im-file-item__name" title="' + escapeHtml(file.name) + '">' + escapeHtml(file.name) + '</p>' +
      '<p class="im-file-item__size">' + formatFileSize(file.size) + '</p>' +
    '</div>' +
    '<div class="im-file-item__status im-file-item__status--' + status + '"' +
    ' id="im-status-' + file._imId + '"></div>';

  list.appendChild(item);
}

function updateFileItem(id, status) {
  const dot = document.getElementById('im-status-' + id);
  if (dot) dot.className = 'im-file-item__status im-file-item__status--' + status;
}

function selectFile(id) {
  IMState.activeId = id;

  document.querySelectorAll('.im-file-item').forEach(function (el) {
    el.classList.remove('im-file-item--active');
  });
  const active = document.getElementById('im-file-item-' + id);
  if (active) active.classList.add('im-file-item--active');

  renderMetadataDetail(id);
}

/* ══════════════════════════════════════════════
   元数据详情渲染
════════════════════════════════════════════════ */
function renderMetadataDetail(id) {
  const result = IMState.results[id];

  const empty     = document.getElementById('emptyState');
  const header    = document.getElementById('resultHeader');
  const summary   = document.getElementById('summaryWrap');
  const sections  = document.getElementById('sectionsWrap');
  const cleaner   = document.getElementById('cleanerCard');

  if (empty)    empty.style.display    = result ? 'none' : 'flex';
  if (header)   header.style.display   = result && !result.error ? 'flex' : 'none';
  if (summary)  summary.style.display  = result && !result.error ? 'block' : 'none';
  if (sections) sections.style.display = result && !result.error ? 'flex' : 'none';
  if (cleaner)  cleaner.style.display  = result && !result.error ? 'block' : 'none';

  if (!result || result.error) {
    if (result && result.error && empty) {
      empty.style.display = 'flex';
      const msg = empty.querySelector('p');
      if (msg) msg.textContent = '解析失败：' + result.error;
    }
    return;
  }

  // 顶部文件信息
  const thumb = document.getElementById('resultThumb');
  if (thumb) thumb.src = result.thumbUrl;
  const nameEl = document.getElementById('resultName');
  if (nameEl) nameEl.textContent = result.fileName;
  const metaEl = document.getElementById('resultMeta');
  if (metaEl) {
    const dims = result.width && result.height ? result.width + ' × ' + result.height + ' px  ·  ' : '';
    metaEl.textContent = dims + formatFileSize(result.fileSize) + '  ·  ' + result.fileType;
  }

  // 渲染摘要与风险
  renderSummary(result);
  renderRisk(result);

  // 渲染分类面板
  renderBasic(result);
  renderCamera(result);
  renderDevice(result);
  renderGPS(result);
  renderExtended(result);
  renderRaw(result);

  // 默认展开基础信息、摘要、拍摄参数
  ['sectionBasic', 'sectionCamera'].forEach(function (sid) {
    const card = document.getElementById(sid);
    if (card && !card.classList.contains('im-section-card--open')) {
      card.classList.add('im-section-card--open');
    }
  });
}

/* ── 渲染摘要卡片 ──────────────────────────── */
function renderSummary(result) {
  const grid = document.getElementById('summaryGrid');
  if (!grid || !result.summary) return;

  const s = result.summary;
  const items = [
    { key: 'hasExif',     label: 'EXIF',       yes: '包含', no: '无' },
    { key: 'hasGPS',      label: 'GPS',        yes: '包含', no: '无' },
    { key: 'hasDateTime', label: '拍摄时间',   yes: '包含', no: '无' },
    { key: 'hasDevice',   label: '设备信息',   yes: '包含', no: '无' },
    { key: 'hasSoftware', label: '软件信息',   yes: '包含', no: '无' },
    { key: 'hasCopyright',label: '版权信息',   yes: '包含', no: '无' },
  ];

  grid.innerHTML = items.map(function (item) {
    const val = s[item.key];
    const active = val ? 'im-summary-cell--yes' : 'im-summary-cell--no';
    return '<div class="im-summary-cell ' + active + '">' +
      '<span class="im-summary-cell__label">' + item.label + '</span>' +
      '<span class="im-summary-cell__value">' + (val ? item.yes : item.no) + '</span>' +
    '</div>';
  }).join('') +
  '<div class="im-summary-cell im-summary-cell--count">' +
    '<span class="im-summary-cell__label">字段数</span>' +
    '<span class="im-summary-cell__value">' + s.fieldCount + '</span>' +
  '</div>';
}

/* ── 渲染隐私风险卡片 ──────────────────────── */
function renderRisk(result) {
  const card = document.getElementById('riskCard');
  if (!card || !result.risk) return;

  const level = result.risk.level;
  const levelMap = {
    low:    { cls: 'im-risk--low',    title: '低风险',    desc: '未发现明显敏感元数据。' },
    medium: { cls: 'im-risk--medium', title: '中等风险',  desc: '发现拍摄时间或设备型号等信息。' },
    high:   { cls: 'im-risk--high',   title: '较高风险',  desc: '发现 GPS 位置信息，发布前建议确认是否需要移除。' },
  };
  const info = levelMap[level] || levelMap.low;

  card.className = 'im-risk-card ' + info.cls;
  card.innerHTML =
    '<div class="im-risk-card__icon">' +
      (level === 'high' ? '⚠' : (level === 'medium' ? '!' : '✓')) +
    '</div>' +
    '<div class="im-risk-card__content">' +
      '<h4 class="im-risk-card__title">' + info.title + '</h4>' +
      '<p class="im-risk-card__desc">' + info.desc + '</p>' +
    '</div>';
}

/* ── 渲染通用字段表格 ──────────────────────── */
function renderFieldTable(bodyId, fields, emptyMsg) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  emptyMsg = emptyMsg || '未检测到相关元数据。常见原因：图片经过社交平台压缩、截图、或元数据已被移除。';

  if (!fields || fields.length === 0) {
    body.innerHTML = '<div class="im-no-data">' + emptyMsg + '</div>';
    return;
  }

  body.innerHTML = fields.map(function (f) {
    return '<div class="im-field-row">' +
      '<span class="im-field-label">' + escapeHtml(f.label) + '</span>' +
      '<span class="im-field-value' + (f.highlight ? ' im-field-value--highlight' : '') + '">' +
        escapeHtml(f.value) +
      '</span>' +
      '<button class="im-copy-field-btn" title="复制"' +
        ' onclick="copyField(this, \'' + escapeAttr(f.value) + '\')">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"' +
          ' stroke="currentColor" stroke-width="2">' +
          '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
          '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
        '</svg>' +
      '</button>' +
    '</div>';
  }).join('');
}

function renderBasic(result) {
  renderFieldTable('bodyBasic', result.sections.basic);
}

function renderCamera(result) {
  renderFieldTable('bodyCamera', result.sections.camera, '未检测到拍摄参数。该图片可能不是相机原图、经过压缩处理，或元数据已被移除。');
}

function renderDevice(result) {
  renderFieldTable('bodyDevice', result.sections.device, '未检测到设备与软件信息。该图片可能不是相机原图，或元数据已被移除。');
}

function renderGPS(result) {
  const gps  = result.sections.gps;
  const body = document.getElementById('bodyGPS');
  if (!body) return;

  if (!gps.fields || gps.fields.length === 0) {
    body.innerHTML = '<div class="im-no-data">未检测到 GPS 位置信息。多数手机和相机默认不会写入 GPS，或已被人为移除。</div>';
    return;
  }

  var tableHtml = gps.fields.map(function (f) {
    return '<div class="im-field-row">' +
      '<span class="im-field-label">' + escapeHtml(f.label) + '</span>' +
      '<span class="im-field-value im-field-value--highlight">' + escapeHtml(f.value) + '</span>' +
      '<button class="im-copy-field-btn" onclick="copyField(this, \'' + escapeAttr(f.value) + '\')">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
          '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
        '</svg>' +
      '</button>' +
    '</div>';
  }).join('');

  var mapHtml = '';
  if (gps.lat != null && gps.lng != null) {
    var lat  = gps.lat.toFixed(6);
    var lng  = gps.lng.toFixed(6);
    var zoom = 14;
    var dLat = 0.01, dLng = 0.01;
    var osmSrc = 'https://www.openstreetmap.org/export/embed.html' +
      '?bbox=' + (parseFloat(lng) - dLng) + ',' + (parseFloat(lat) - dLat) + ',' +
               (parseFloat(lng) + dLng) + ',' + (parseFloat(lat) + dLat) +
      '&layer=mapnik&marker=' + lat + ',' + lng;
    var osmUrl = 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lng +
      '#map=' + zoom + '/' + lat + '/' + lng;
    var coords = lat + ', ' + lng;

    mapHtml =
      '<div class="im-gps-warning">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
        '<span>这张图片包含 GPS 坐标。发布到公开平台前，请确认是否需要移除位置信息。</span>' +
      '</div>' +
      '<div class="im-gps-map-wrap">' +
        '<iframe src="' + osmSrc + '" title="拍摄地点地图" loading="lazy"' +
          ' allow="geolocation \'none\'"></iframe>' +
      '</div>' +
      '<div class="im-gps-map-actions">' +
        '<a class="im-gps-action-btn" href="' + osmUrl + '" target="_blank" rel="noopener">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 21 18 21 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> 在 OpenStreetMap 中打开' +
        '</a>' +
        '<button class="im-gps-action-btn" onclick="copyField(this, \'' + coords + '\')">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制坐标' +
        '</button>' +
      '</div>';
  }

  body.innerHTML = tableHtml + mapHtml;
}

function renderExtended(result) {
  renderFieldTable('bodyExtended', result.sections.extended, '未检测到 IPTC、XMP 或 ICC 扩展信息。');
}

function renderRaw(result) {
  const pre = document.getElementById('rawJsonPre');
  if (!pre) return;
  const cleaned = cleanRawForDisplay(result.raw);
  const keys = Object.keys(cleaned);
  if (keys.length === 0) {
    pre.textContent = '未检测到任何元数据字段。该图片可能不包含 EXIF/IPTC/XMP/ICC 信息，或已被压缩/编辑工具移除。';
  } else {
    pre.textContent = JSON.stringify(cleaned, null, 2);
  }
  pre.dataset.raw = JSON.stringify(cleaned);
}

/* 过滤超大二进制字段 */
function cleanRawForDisplay(raw) {
  const out = {};
  for (const k in raw) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    const v = raw[k];
    if (v instanceof Uint8Array || v instanceof ArrayBuffer) {
      out[k] = '[Binary ' + (v.byteLength || v.length) + ' bytes]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

/* ── 原始数据 Tab 切换 ──────────────────────── */
function switchRawTab(tab) {
  document.querySelectorAll('.im-raw-tab').forEach(function (btn) {
    btn.classList.toggle('im-raw-tab--active', btn.dataset.tab === tab);
  });
  const pre = document.getElementById('rawJsonPre');
  if (!pre) return;
  const raw = JSON.parse(pre.dataset.raw || '{}');

  if (tab === 'structured') {
    const structured = {};
    const groups = ['Make','Model','LensModel','DateTimeOriginal','CreateDate','FNumber','ExposureTime','ISOSpeedRatings','ISO','FocalLength','GPSLatitude','GPSLongitude','latitude','longitude','Software','Copyright','Artist'];
    const lowerMap = {};
    for (const rk of Object.keys(raw)) lowerMap[rk.toLowerCase()] = rk;
    for (const k of groups) {
      let src = k;
      if (raw[k] === undefined && lowerMap[k.toLowerCase()]) {
        src = lowerMap[k.toLowerCase()];
      }
      if (raw[src] !== undefined) structured[src] = raw[src];
    }
    pre.textContent = Object.keys(structured).length > 0
      ? JSON.stringify(structured, null, 2)
      : '未在原始数据中找到常用结构化字段。';
  } else if (tab === 'all') {
    const keys = Object.keys(raw);
    pre.textContent = keys.length > 0
      ? JSON.stringify(raw, null, 2)
      : '未检测到任何元数据字段。';
  } else {
    pre.textContent = JSON.stringify(raw, null, 2);
  }
}

/* ══════════════════════════════════════════════
   分类卡片折叠
════════════════════════════════════════════════ */
function toggleSection(id) {
  const card = document.getElementById(id);
  if (card) card.classList.toggle('im-section-card--open');
}

/* ══════════════════════════════════════════════
   字段复制
════════════════════════════════════════════════ */
function copyField(btn, value) {
  navigator.clipboard.writeText(value).then(function () {
    if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('img-metadata-ui', 'text');
    btn.classList.add('im-copy-field-btn--copied');
    btn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"' +
        ' stroke="currentColor" stroke-width="2.5">' +
        '<polyline points="20 6 9 17 4 12"/>' +
      '</svg>';
    setTimeout(function () {
      btn.classList.remove('im-copy-field-btn--copied');
      btn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"' +
          ' stroke="currentColor" stroke-width="2">' +
          '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
          '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
        '</svg>';
    }, 2000);
  }).catch(function () { showToast('复制失败', 'error'); });
}

function copyRawData(e) {
  e.stopPropagation();
  const result = IMState.results[IMState.activeId];
  if (!result) return;
  navigator.clipboard.writeText(JSON.stringify(result.raw, null, 2)).then(function () {
    if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('img-metadata-ui', 'json');
    showToast('已复制全部 JSON', 'success');
  });
}

/* ══════════════════════════════════════════════
   元数据清理（UI 预留）
════════════════════════════════════════════════ */
function cleanMetadata() {
  showToast('元数据清理功能即将上线', 'info');
}

function downloadCleaned() {
  showToast('请先执行清理操作', 'info');
}

/* ══════════════════════════════════════════════
   Toast
════════════════════════════════════════════════ */
function showToast(msg, type) {
  type = type || 'info';
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className   = 'im-toast im-toast--' + type;
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { el.classList.add('im-toast--show'); });
  });
  setTimeout(function () {
    el.classList.remove('im-toast--show');
    setTimeout(function () { el.remove(); }, 300);
  }, 3500);
}

/* ══════════════════════════════════════════════
   工具函数
════════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
