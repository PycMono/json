/**
 * img-metadata-engine.js
 * 图片元数据解析引擎（基于 exifr.js）
 * 架构：文件 → exifr.parse → 分类 → 格式化输出 + 隐私风险评估
 */

'use strict';

/* ═══════════════════════════════════════════════
   全局状态
═══════════════════════════════════════════════ */
const IMState = {
  files:    [],
  results:  {},
  activeId: null,
};

const IM_MAX_FILES   = 10;
const IM_MAX_SIZE_MB = 100;

/* ═══════════════════════════════════════════════
   文件校验 & 入队
═══════════════════════════════════════════════ */
function addFiles(fileList) {
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/tiff', 'image/heic', 'image/heif',
  ];
  let added = 0;

  for (const file of Array.from(fileList)) {
    if (IMState.files.length >= IM_MAX_FILES) {
      showToast(`最多同时分析 ${IM_MAX_FILES} 张图片`, 'error'); break;
    }
    const typeOk = allowed.includes(file.type) ||
      /\.(jpe?g|png|webp|tiff?|heic|heif)$/i.test(file.name);
    if (!typeOk) {
      showToast(`${file.name}：不支持的格式`, 'error'); continue;
    }
    if (file.size > IM_MAX_SIZE_MB * 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      showToast(`${file.name} (${fileSizeMB}MB) 超过 ${IM_MAX_SIZE_MB}MB 限制`, 'error'); continue;
    }
    const key = `${file.name}-${file.size}`;
    if (IMState.files.some(f => `${f.name}-${f.size}` === key)) continue;

    file._imId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    IMState.files.push(file);
    added++;
  }

  if (added > 0) processNewFiles();
}

/* ═══════════════════════════════════════════════
   处理新加入的文件（串行队列）
═══════════════════════════════════════════════ */
async function processNewFiles() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('img-metadata-engine');
  showResultsSection();

  const pending = IMState.files.filter(f => !IMState.results[f._imId]);

  for (const file of pending) {
    addFileItem(file, 'processing');
    try {
      const result = await parseMetadata(file);
      IMState.results[file._imId] = result;
      updateFileItem(file._imId, 'done');
      if (!IMState.activeId) selectFile(file._imId);
    } catch (err) {
      IMState.results[file._imId] = { error: err.message, file };
      updateFileItem(file._imId, 'error');
    }
  }
  var doneCount = pending.filter(function(f) { return IMState.results[f._imId] && !IMState.results[f._imId].error; }).length;
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('img-metadata-engine', doneCount, Date.now() - _gaStart);
}

/* ═══════════════════════════════════════════════
   核心解析：exifr.js
═══════════════════════════════════════════════ */
async function parseMetadata(file) {
  let raw = {};

  try {
    const main = await exifr.parse(file, {
      tiff: true, exif: true, gps: true,
      iptc: true, xmp: true,
      icc: true, jfif: true, ihdr: true,
      multiSegment: true,
      mergeOutput: true,
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
      sanitize: false,
    });
    if (main) Object.assign(raw, main);
  } catch (e) { /* ignore */ }

  try {
    const gps = await exifr.gps(file);
    if (gps && gps.latitude != null) {
      raw.latitude  = gps.latitude;
      raw.longitude = gps.longitude;
    }
  } catch (e) { /* ignore */ }

  const dims = await getImageDimensions(file);

  return {
    id:       file._imId,
    file,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || guessType(file.name),
    width:    dims.w,
    height:   dims.h,
    raw,
    thumbUrl: URL.createObjectURL(file),
    sections: buildSections(file, dims, raw),
    summary:  buildSummary(raw),
    risk:     assessPrivacyRisk(raw),
  };
}

/* ═══════════════════════════════════════════════
   健壮取值：兼容 exifr 键名大小写/别名差异
═══════════════════════════════════════════════ */
function pick(raw, ...keys) {
  for (const k of keys) {
    if (raw[k] != null) return raw[k];
  }
  // 大小写不敏感兜底
  const lowerMap = {};
  for (const k of Object.keys(raw)) {
    lowerMap[k.toLowerCase()] = raw[k];
  }
  for (const k of keys) {
    const v = lowerMap[k.toLowerCase()];
    if (v != null) return v;
  }
  return undefined;
}

function isEmptyValue(v) {
  if (v == null || v === '' || v === undefined) return true;
  if (typeof v === 'object') {
    if (v instanceof Uint8Array || v instanceof ArrayBuffer) return true;
    if (Array.isArray(v) && v.length === 0) return true;
  }
  return false;
}

/* ═══════════════════════════════════════════════
   构建分类数据
═══════════════════════════════════════════════ */
function buildSections(file, dims, raw) {
  return {
    basic:    buildBasic(file, dims, raw),
    camera:   buildCamera(raw),
    device:   buildDevice(raw),
    gps:      buildGPS(raw),
    extended: buildExtended(raw),
  };
}

function buildBasic(file, dims, raw) {
  const fields = [];
  push(fields, '文件名',    file.name);
  push(fields, '文件大小',  formatFileSize(file.size));
  push(fields, '格式',      file.type || guessType(file.name));
  if (dims.w && dims.h) {
    push(fields, '图片尺寸', `${dims.w} × ${dims.h} px`, true);
    push(fields, '宽高比',   reduceRatio(dims.w, dims.h));
    push(fields, '总像素',   `${(dims.w * dims.h / 1000000).toFixed(2)} MP`);
  }
  push(fields, 'MIME 类型', file.type || guessType(file.name));
  const cs = pick(raw, 'ColorSpace');
  push(fields, '色彩空间',  cs === 1 ? 'sRGB' : (cs === 65535 ? 'Uncalibrated' : cs));
  const bps = pick(raw, 'BitsPerSample');
  push(fields, '位深度',    bps != null ? `${bps} bit` : null);
  push(fields, '方向',      formatOrientation(pick(raw, 'Orientation')));
  push(fields, '最后修改',  formatDate(file.lastModified ? new Date(file.lastModified) : null));
  return fields;
}

function buildCamera(raw) {
  const fields = [];
  const make   = pick(raw, 'Make');
  const model  = pick(raw, 'Model');
  const lens   = pick(raw, 'LensModel', 'LensID', 'Lens', 'LensInfo');
  const et     = pick(raw, 'ExposureTime', 'ShutterSpeedValue');
  const fn     = pick(raw, 'FNumber');
  const av     = pick(raw, 'ApertureValue');
  const iso    = pick(raw, 'ISOSpeedRatings', 'ISO', 'ISOSpeed', 'PhotographicSensitivity');
  const fl     = pick(raw, 'FocalLength');
  const fl35   = pick(raw, 'FocalLengthIn35mmFilm');
  const flash  = pick(raw, 'Flash');
  const wb     = pick(raw, 'WhiteBalance');
  const mm     = pick(raw, 'MeteringMode');
  const em     = pick(raw, 'ExposureMode');
  const ebv    = pick(raw, 'ExposureBiasValue', 'ExposureCompensation');
  const ep     = pick(raw, 'ExposureProgram');
  const dto    = pick(raw, 'DateTimeOriginal', 'DateTime', 'CreateDate', 'ModifyDate');
  const cd     = pick(raw, 'CreateDate');
  const st     = pick(raw, 'SceneType');
  const sct    = pick(raw, 'SceneCaptureType');
  const sd     = pick(raw, 'SubjectDistance');
  const dzr    = pick(raw, 'DigitalZoomRatio');
  const sm     = pick(raw, 'SensingMethod');
  const fs     = pick(raw, 'FileSource');
  const sharp  = pick(raw, 'Sharpness');
  const sat    = pick(raw, 'Saturation');
  const cont   = pick(raw, 'Contrast');
  const cbpp   = pick(raw, 'CompressedBitsPerPixel');

  push(fields, '相机品牌',  make);
  push(fields, '相机型号',  model);
  push(fields, '镜头型号',  lens);
  push(fields, '快门速度',  formatShutter(et));
  push(fields, '光圈值',    fn != null ? `f/${Number(fn).toFixed(1)}` : (av != null ? `f/${(Math.pow(2, Number(av)/2)).toFixed(1)}` : null), true);
  push(fields, 'ISO 感光度', iso != null ? String(iso) : null, true);
  push(fields, '焦距',      fl != null ? `${fl} mm` : null);
  push(fields, '等效焦距',  fl35 != null ? `${fl35} mm` : null);
  push(fields, '闪光灯',    formatFlash(flash));
  push(fields, '白平衡',    formatWhiteBalance(wb));
  push(fields, '测光模式',  formatMeteringMode(mm));
  push(fields, '曝光模式',  formatExposureMode(em));
  push(fields, '曝光补偿',  ebv != null ? `${Number(ebv) > 0 ? '+' : ''}${ebv} EV` : null);
  push(fields, '曝光程序',  formatExposureProgram(ep));
  push(fields, '拍摄时间',  formatDate(dto), true);
  push(fields, '数字化时间', formatDate(cd));
  push(fields, '场景类型',  st === 1 ? '直接拍摄' : st);
  push(fields, '场景捕获类型', formatSceneCaptureType(sct));
  push(fields, '主体距离',  sd != null ? `${sd} m` : null);
  push(fields, '数字变焦',  dzr != null ? `${dzr}x` : null);
  push(fields, '感光方法',  formatSensingMethod(sm));
  push(fields, '文件源',    fs === 3 ? '数码相机' : fs);
  push(fields, '锐度',      formatSharpness(sharp));
  push(fields, '饱和度',    formatSaturation(sat));
  push(fields, '对比度',    formatContrast(cont));
  push(fields, '压缩率',    cbpp != null ? `${cbpp} bpp` : null);
  return fields;
}

function buildDevice(raw) {
  const fields = [];
  push(fields, '设备品牌',  pick(raw, 'Make'));
  push(fields, '设备型号',  pick(raw, 'Model'));
  push(fields, '镜头信息',  pick(raw, 'LensModel', 'LensID', 'Lens', 'LensInfo'));
  push(fields, '系统/软件', pick(raw, 'Software', 'ProcessingSoftware'));
  push(fields, '编辑软件',  pick(raw, 'Software'));
  push(fields, '处理工具',  pick(raw, 'ProcessingSoftware'));
  push(fields, '图片方向',  formatOrientation(pick(raw, 'Orientation')));
  push(fields, '分辨率单位', pick(raw, 'ResolutionUnit') === 2 ? '英寸' : (pick(raw, 'ResolutionUnit') === 3 ? '厘米' : pick(raw, 'ResolutionUnit')));
  push(fields, '水平分辨率', pick(raw, 'XResolution') != null ? `${pick(raw, 'XResolution')} DPI` : null);
  push(fields, '垂直分辨率', pick(raw, 'YResolution') != null ? `${pick(raw, 'YResolution')} DPI` : null);
  push(fields, '色彩空间',  pick(raw, 'ColorSpace') === 1 ? 'sRGB' : (pick(raw, 'ColorSpace') === 65535 ? 'Uncalibrated' : pick(raw, 'ColorSpace')));
  const icc = pick(raw, 'ProfileDescription', 'IccProfile', 'icc', 'ICC');
  push(fields, 'ICC Profile', (typeof icc === 'string' || typeof icc === 'number') ? icc : null);
  return fields;
}

function buildGPS(raw) {
  const fields = [];
  const lat = pick(raw, 'latitude', 'GPSLatitude', 'GPSLatitudeRef');
  const lng = pick(raw, 'longitude', 'GPSLongitude', 'GPSLongitudeRef');
  const alt = pick(raw, 'GPSAltitude');
  const dir = pick(raw, 'GPSImgDirection', 'GPSDestBearing');
  const spd = pick(raw, 'GPSSpeed');
  const gpsDate = pick(raw, 'GPSDateStamp', 'GPSTimeStamp');
  const gpsStatus = pick(raw, 'GPSStatus');

  push(fields, '纬度',      lat != null ? (typeof lat === 'number' ? lat.toFixed(7) : String(lat)) : null, true);
  push(fields, '经度',      lng != null ? (typeof lng === 'number' ? lng.toFixed(7) : String(lng)) : null, true);
  push(fields, '海拔',      alt != null ? `${Number(alt).toFixed(1)} m` : null);
  push(fields, '拍摄方向',  dir != null ? `${Number(dir).toFixed(1)}°` : null);
  push(fields, 'GPS 速度',  spd != null ? `${Number(spd).toFixed(1)} km/h` : null);
  push(fields, 'GPS 时间',  formatDate(gpsDate));
  push(fields, 'GPS 状态',  gpsStatus);

  const latNum = typeof lat === 'number' ? lat : null;
  const lngNum = typeof lng === 'number' ? lng : null;
  return { fields, lat: latNum, lng: lngNum };
}

function buildExtended(raw) {
  const fields = [];

  // IPTC
  push(fields, 'IPTC-版权',      pick(raw, 'Copyright', 'CopyrightNotice'));
  push(fields, 'IPTC-作者',      pick(raw, 'Artist', 'Creator', 'By_line', 'By-line'));
  push(fields, 'IPTC-标题',      pick(raw, 'Headline', 'Title'));
  push(fields, 'IPTC-描述',      pick(raw, 'ImageDescription', 'Caption', 'Caption-Abstract', 'Description'));
  const keywords = pick(raw, 'Keywords');
  push(fields, 'IPTC-关键词',    Array.isArray(keywords) ? keywords.join(', ') : keywords);
  push(fields, 'IPTC-来源',      pick(raw, 'Credit', 'Source'));
  push(fields, 'IPTC-城市',      pick(raw, 'City', 'Location'));
  push(fields, 'IPTC-省/州',     pick(raw, 'Province-State', 'State'));
  push(fields, 'IPTC-国家',      pick(raw, 'Country', 'Country-PrimaryLocationName'));
  push(fields, 'IPTC-类别',      pick(raw, 'Category', 'ObjectAttribute'));
  push(fields, 'IPTC-特殊说明',  pick(raw, 'SpecialInstructions'));

  // XMP
  const rating = pick(raw, 'Rating', 'xmp:Rating');
  push(fields, 'XMP-评级',       rating != null ? '⭐'.repeat(Math.max(0, Math.min(5, parseInt(rating)))) + ` (${rating})` : null);
  push(fields, 'XMP-创建工具',   pick(raw, 'CreatorTool', 'xmp:CreatorTool', 'Software'));
  push(fields, 'XMP-修改工具',   pick(raw, 'HistorySoftwareAgent'));
  push(fields, 'XMP-标签颜色',   pick(raw, 'Label', 'xmp:Label'));
  push(fields, 'XMP-创建日期',   formatDate(pick(raw, 'CreateDate', 'DateCreated')));
  push(fields, 'XMP-修改日期',   formatDate(pick(raw, 'ModifyDate', 'MetadataDate')));

  // ICC
  const iccDesc = pick(raw, 'ProfileDescription', 'ColorSpace');
  push(fields, 'ICC-色彩空间',   (typeof iccDesc === 'string' || typeof iccDesc === 'number') ? iccDesc : null);
  const iccProf = pick(raw, 'IccProfile', 'icc', 'ICC');
  push(fields, 'ICC-Profile',    (typeof iccProf === 'string' || typeof iccProf === 'number') ? iccProf : null);
  const iccModel = pick(raw, 'ColorModel', 'PhotometricInterpretation');
  push(fields, 'ICC-色彩模型',   (typeof iccModel === 'string' || typeof iccModel === 'number') ? iccModel : null);

  return fields;
}

/* ═══════════════════════════════════════════════
   元数据摘要 & 隐私风险评估
═══════════════════════════════════════════════ */
function buildSummary(raw) {
  const hasGPS = pick(raw, 'latitude', 'GPSLatitude') != null && pick(raw, 'longitude', 'GPSLongitude') != null;
  const hasDateTime = pick(raw, 'DateTimeOriginal', 'DateTime', 'CreateDate') != null;
  const hasDevice = pick(raw, 'Make') != null || pick(raw, 'Model') != null;
  const hasSoftware = pick(raw, 'Software', 'ProcessingSoftware') != null;
  const hasCopyright = pick(raw, 'Copyright', 'CopyrightNotice') != null || pick(raw, 'Artist', 'Creator') != null;
  const fieldCount = Object.keys(raw).length;
  const hasExif = fieldCount > 0;

  return {
    hasExif,
    hasGPS,
    hasDateTime,
    hasDevice,
    hasSoftware,
    hasCopyright,
    fieldCount,
  };
}

function assessPrivacyRisk(raw) {
  const hasGPS = pick(raw, 'latitude', 'GPSLatitude') != null && pick(raw, 'longitude', 'GPSLongitude') != null;
  const hasDateTime = pick(raw, 'DateTimeOriginal', 'DateTime', 'CreateDate') != null;
  const hasDevice = pick(raw, 'Make') != null || pick(raw, 'Model') != null;
  const hasSoftware = pick(raw, 'Software', 'ProcessingSoftware') != null;

  if (hasGPS) {
    return { level: 'high', reasons: ['gps'] };
  }
  if (hasDateTime && hasDevice) {
    return { level: 'medium', reasons: ['datetime', 'device'] };
  }
  if (hasDateTime || hasDevice || hasSoftware) {
    return { level: 'medium', reasons: hasDateTime ? ['datetime'] : ['device'] };
  }
  return { level: 'low', reasons: [] };
}

/* ═══════════════════════════════════════════════
   字段 push 工具
═══════════════════════════════════════════════ */
function push(arr, label, value, highlight = false) {
  if (isEmptyValue(value)) return;
  arr.push({ label, value: String(value), highlight });
}

/* ═══════════════════════════════════════════════
   格式化工具函数
═══════════════════════════════════════════════ */
function getImageDimensions(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: null, h: null }); };
    img.src = url;
  });
}

function formatShutter(val) {
  if (val == null) return null;
  if (val >= 1) return `${val}s`;
  return `1/${Math.round(1 / val)}s`;
}

function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toLocaleString('zh-CN', { hour12: false });
  }
  if (typeof val === 'string') {
    return val.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1/$2/$3');
  }
  return String(val);
}

function formatOrientation(val) {
  const map = {
    1: '正常', 2: '水平翻转', 3: '旋转 180°', 4: '垂直翻转',
    5: '顺时针 90° + 水平翻转', 6: '顺时针 90°',
    7: '逆时针 90° + 水平翻转', 8: '逆时针 90°',
  };
  return val ? (map[val] || `值 ${val}`) : null;
}

function formatFlash(val) {
  if (val == null) return null;
  return (val & 0x1) ? '已闪光' : '未闪光';
}

function formatWhiteBalance(val) {
  if (val == null) return null;
  return val === 0 ? '自动' : (val === 1 ? '手动' : `值 ${val}`);
}

function formatMeteringMode(val) {
  const map = { 0:'未知', 1:'平均', 2:'中央重点', 3:'点测光', 4:'多点', 5:'多分区', 6:'局部' };
  return val != null ? (map[val] || `值 ${val}`) : null;
}

function formatExposureMode(val) {
  const map = { 0:'自动曝光', 1:'手动曝光', 2:'自动包围曝光' };
  return val != null ? (map[val] || `值 ${val}`) : null;
}

function formatExposureProgram(val) {
  const map = { 0:'未定义', 1:'手动', 2:'正常程序', 3:'光圈优先', 4:'快门优先', 5:'创意程序', 6:'动作程序', 7:'人像模式', 8:'风景模式' };
  return val != null ? (map[val] || `值 ${val}`) : null;
}

function formatSceneCaptureType(val) {
  const map = { 0:'标准', 1:'风景', 2:'人物', 3:'夜景' };
  return val != null ? (map[val] || `值 ${val}`) : null;
}

function formatSensingMethod(val) {
  const map = { 1:'未定义', 2:'单芯片彩色区域传感器', 3:'双芯片彩色区域传感器', 4:'三芯片彩色区域传感器', 5:'彩色顺序区域传感器', 7:'三线性传感器', 8:'彩色顺序线性传感器' };
  return val != null ? (map[val] || `值 ${val}`) : null;
}

function formatSharpness(val) {
  const map = { 0:'正常', 1:'柔和', 2:'硬' };
  return val != null ? (map[val] || `值 ${val}`) : null;
}

function formatSaturation(val) {
  const map = { 0:'正常', 1:'低饱和度', 2:'高饱和度' };
  return val != null ? (map[val] || `值 ${val}`) : null;
}

function formatContrast(val) {
  const map = { 0:'正常', 1:'柔和', 2:'硬' };
  return val != null ? (map[val] || `值 ${val}`) : null;
}

function reduceRatio(w, h) {
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const g = gcd(w, h);
  return `${w/g}:${h/g}`;
}

function guessType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png',
                webp:'image/webp', tif:'image/tiff', tiff:'image/tiff',
                heic:'image/heic', heif:'image/heif' };
  return map[ext] || 'image/*';
}

function formatFileSize(bytes) {
  if (!bytes)              return '0 B';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ═══════════════════════════════════════════════
   导出：JSON / CSV / TXT
═══════════════════════════════════════════════ */
function exportData(format) {
  const result = IMState.results[IMState.activeId];
  if (!result || result.error) { showToast('无可导出的数据', 'info'); return; }
  if (typeof gaTrackDownload === 'function') gaTrackDownload('img-metadata-engine', format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/plain');

  const base = result.fileName.replace(/\.[^.]+$/, '');

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(result.raw, null, 2)], { type: 'application/json' });
    saveAs(blob, `${base}-metadata.json`);

  } else if (format === 'csv') {
    const rows = [['Category', 'Field', 'Value']];
    const { basic, camera, device, gps, extended } = result.sections;
    const allSections = [
      ['Basic',  basic ],
      ['Camera', camera],
      ['Device', device],
      ['GPS',    Array.isArray(gps) ? gps : gps.fields],
      ['Extended', extended],
    ];
    for (const [cat, fields] of allSections) {
      if (!fields) continue;
      for (const f of fields) {
        rows.push([cat, f.label, `"${f.value.replace(/"/g, '""')}"`]);
      }
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${base}-metadata.csv`);

  } else if (format === 'txt') {
    const lines = [
      `图片元数据报告`,
      `文件：${result.fileName}`,
      `生成时间：${new Date().toLocaleString('zh-CN')}`,
      '═'.repeat(50),
      '',
    ];
    const sectionNames = { basic:'基础信息', camera:'拍摄参数', device:'设备与软件', gps:'GPS 位置', extended:'扩展元数据' };
    for (const [key, name] of Object.entries(sectionNames)) {
      let fields = result.sections[key];
      if (key === 'gps') fields = fields.fields;
      if (!fields || fields.length === 0) continue;
      lines.push(`【${name}】`);
      for (const f of fields) {
        lines.push(`  ${f.label.padEnd(14)}${f.value}`);
      }
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${base}-metadata.txt`);
  }

  showToast(`已导出 ${format.toUpperCase()}`, 'success');
}

/* ═══════════════════════════════════════════════
   批量 ZIP 导出
═══════════════════════════════════════════════ */
async function exportAll() {
  const done = Object.values(IMState.results).filter(r => !r.error);
  if (done.length === 0) { showToast('没有可导出的数据', 'info'); return; }

  const btn = document.querySelector('.im-btn-download-all');
  if (btn) { btn.disabled = true; btn.textContent = '打包中...'; }

  try {
    const zip = new JSZip();
    for (const r of done) {
      const base = r.fileName.replace(/\.[^.]+$/, '');
      zip.file(`${base}-metadata.json`, JSON.stringify(r.raw, null, 2));
    }
    const ts = new Date().toISOString().slice(0, 10);
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE',
      compressionOptions: { level: 1 } });
    saveAs(zipBlob, `image-metadata-${ts}.zip`);
    if (typeof gaTrackDownload === 'function') gaTrackDownload('img-metadata-engine', 'application/zip');
    showToast(`已打包 ${done.length} 张图片的元数据`, 'success');
  } catch (err) {
    showToast('打包失败：' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 打包下载全部（ZIP）'; }
  }
}

/* ═══════════════════════════════════════════════
   清空
═══════════════════════════════════════════════ */
function clearAll() {
  for (const r of Object.values(IMState.results)) {
    if (r.thumbUrl) URL.revokeObjectURL(r.thumbUrl);
  }
  IMState.files = []; IMState.results = {}; IMState.activeId = null;
  document.getElementById('fileList').innerHTML       = '';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('bulkExport').style.display     = 'none';
  showToast('已清空全部', 'info');
}
