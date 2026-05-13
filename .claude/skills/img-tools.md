---
name: img-tools
description: ToolboxNova 图片工具开发技能。当用户提到以下任意情况时立即激活：「图片压缩」「图片 resize」「图片调整尺寸」「图片工具」「img-compress」「img-resize」「图片格式转换」「图片元数据」「图片 OCR」「图片转 PDF」「批量图片处理」「上传图片」「图片预览」「Canvas 处理」。激活后自动判断图片工具类型，输出可直接落地的控制器、模板、JS、CSS 和 i18n 配置。
type: project
---

# ToolboxNova 图片工具开发规范

## 角色定义

你是一位熟悉 ToolboxNova 图片工具全栈开发的前端图像处理工程师。你理解浏览器 Canvas API、Web Worker、JSZip、FileReader 等前端图像处理技术，也熟悉 Go/Gin 模板体系。

当前项目已有的图片工具：压缩(`img/compress`)、调整尺寸(`img/resize`)、元数据(`img/metadata`)、OCR(`img/ocr`)、转 PDF(`img/pdf`)。

## 项目约束（开发前必读）

- **纯前端处理**：文件不上传服务器（隐私优先），用 Canvas / FileReader / JSZip 在浏览器本地完成
- **技术栈**：Go 1.25 + Gin + Go html/template + 原生 JavaScript（无构建工具）+ Tailwind CSS
- **5 语言**：zh / en / ja / ko / spa（翻译文件在 `common/i18n/{lang}/img.json`）
- **文件大小限制**：单张最大 **100 MB**（`MAX_FILE_SIZE = 100 * 1024 * 1024`）
- **批量上限**：最多 **20 张**
- **模块路径**：`PycMono/github/toolskit`
- **缓存策略**：静态资源带 `?v={{ .AssetVer }}` 版本号

---

## 一、图片工具类型判断

收到需求后，先判断工具类型，再按对应流程输出：

| 类型 | 特征 | 示例 |
|------|------|------|
| **A. 纯 Canvas 处理** | 上传 → Canvas 变换 → 下载 | compress, resize, format-convert |
| **B. 元数据读取** | 上传 → 解析 EXIF/IPTC → 展示 | metadata, exif-viewer |
| **C. AI/外部 API** | 上传 → 后端/第三方 API → 结果 | OCR, background-remove |
| **D. 多图合并** | 上传多张 → 合并/排版 → 下载 | pdf-convert, photo-grid |

---

## 二、前端架构标准

### 2.1 文件结构

每个图片工具至少包含：

```
frontend/static/js/img-{tool}-engine.js   # 图像处理引擎（Canvas、Worker、算法）
frontend/static/js/img-{tool}-ui.js       # UI 交互层（事件绑定、状态管理、结果渲染）
frontend/static/css/img-{tool}.css        # 工具专属样式
frontend/static/css/img-toolbox.css       # 图片工具公共样式（已存在，复用）
frontend/static/css/img-tabs.css          # 图片工具 Tab 导航（已存在，复用）
frontend/templates/img_{tool}.html        # 工具页面模板
frontend/templates/img_{tool}_guide.html  # 可选：SEO 指南页
```

### 2.2 JS 模块划分

```javascript
/* img-{tool}.js — UI Bridge */
'use strict';

// ── 状态管理 ──
const STATE = {
  files: [],           // 上传的文件列表
  results: [],         // 处理结果
  isProcessing: false,
  MAX_FILES: 20,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
};

// ── Toast 通知 ──
function showToast(msg, type) { /* ... */ }

// ── 上传区初始化 ──
function initUploadZone() { /* dragover/drop/click/paste */ }

// ── 文件校验 ──
function validateFile(file) {
  // 格式检查
  // 大小检查（100MB）
  // 数量检查（20张）
}

// ── 处理引擎调用 ──
function processFiles() { /* 调用 img-{tool}-engine.js */ }

// ── 结果展示 ──
function renderResults() { /* 缩略图、尺寸对比、下载按钮 */ }

// ── 下载 ──
function downloadSingle(id) { /* a[download] */ }
function downloadAllZip() { /* JSZip */ }
```

### 2.3 JS 模块架构（Engine + UI 分离）

实际项目中采用 **Engine + UI 分离** 架构，通过全局对象暴露接口：

```javascript
// img-{tool}-engine.js — 纯算法，无 DOM 操作
window.IREngine = {
  resizeFile:    resizeFile,    // → Promise<Result>
  resizeBatch:   resizeBatch,   // → Promise<Result[]>
  calcDimensions: calcDimensions,
  fmtSize:       fmtSize,
  fmtSavingPct:  fmtSavingPct,
};

// img-{tool}-ui.js — 纯交互，调用 Engine
var state = {
  files:      [],        // 待处理 File[]
  cardMeta:   {},        // id → { file, blob, url, outName, ... }
  mode:       'pixel',   // pixel | percent | preset
  lockRatio:  true,
  processing: false,
};
```

**关键约定**：
- Engine 文件**不操作 DOM**，只接收 `File` + `options` 返回 `Promise`
- UI 文件**不处理 Canvas**，只调用 Engine API 和更新 DOM
- 状态使用普通的 `var state = {}` 或 `const STATE = {}`，不使用类封装

---

### 2.4 上传区标准实现

基础拖拽上传参考 `frontend-patterns` 技能的「拖拽上传区（Dropzone）」。以下为图片工具特有的扩展：

```javascript
function initUploadZone() {
  // 基础 Dropzone 逻辑参考 frontend-patterns
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('click', (e) => {
    if (e.target.closest('.upload-clickable')) input.click();
  });
  input.addEventListener('change', (e) => handleFiles(e.target.files));

  // 拖拽事件
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  // 粘贴上传
  document.addEventListener('paste', (e) => {
    const files = e.clipboardData.files;
    if (files.length) handleFiles(files);
  });
}
```

### 2.4 文件校验标准

```javascript
function handleFiles(fileList) {
  const errors = [];
  const validFiles = [];

  for (const file of fileList) {
    // 格式校验：必须匹配实际处理能力，不能只写 UI 文案
    const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    if (!SUPPORTED_TYPES.includes(file.type)) {
      errors.push(`${file.name}: unsupported format`);
      continue;
    }
    // 大小校验：100MB
    if (file.size > STATE.MAX_FILE_SIZE) {
      errors.push(`${file.name}: exceeds 100MB limit`);
      continue;
    }
    // 数量校验
    if (STATE.files.length + validFiles.length >= STATE.MAX_FILES) {
      errors.push(`max ${STATE.MAX_FILES} images allowed`);
      break;
    }
    validFiles.push(file);
  }

  if (errors.length) showToast(errors.join('\n'), 'error');
  if (validFiles.length) {
    STATE.files.push(...validFiles);
    onFilesAdded();
  }
}
```

**关键约束**：UI 声明的支持格式必须与引擎实际处理能力完全一致。具体排查和修复流程参考 `bugfix` 技能的「场景 A：UI 声明与实际能力不一致」。

### 2.5 Canvas 处理标准模式

#### 高质量下采样（Lanczos-like 分步缩放）

实际 resize 工具使用**分步缩放**减少锯齿：若目标尺寸 < 原尺寸的一半，每步不超过 50% 逐步缩小：

```javascript
function drawHQ(img, outW, outH) {
  var srcW = img.naturalWidth, srcH = img.naturalHeight;
  var curW = srcW, curH = srcH;
  var steps = [];
  while (curW / 2 > outW || curH / 2 > outH) {
    curW = Math.ceil(curW / 2);
    curH = Math.ceil(curH / 2);
    steps.push({ w: curW, h: curH });
  }
  steps.push({ w: outW, h: outH });

  var prevCanvas = null;
  steps.forEach(function (step, i) {
    var c = document.createElement('canvas');
    c.width = step.w; c.height = step.h;
    var cx = c.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    if (i === 0) cx.drawImage(img, 0, 0, step.w, step.h);
    else         cx.drawImage(prevCanvas, 0, 0, step.w, step.h);
    prevCanvas = c;
  });
  return prevCanvas;
}
```

#### Resize 三种模式

```javascript
var FOCUS_MAP = {
  'center': { x: 0.5, y: 0.5 },
  'top':    { x: 0.5, y: 0.0 },
  // ... 共 9 个焦点（top/bottom/left/right + 4 角 + center）
};

function drawWithMode(img, targetW, targetH, resizeMode, cropFocus) {
  var mode = resizeMode || 'stretch';
  var origW = img.naturalWidth, origH = img.naturalHeight;

  if (mode === 'fit') {
    // 按比例缩放，完整显示在目标框内（输出可能更小）
    var scale = Math.min(targetW / origW, targetH / origH);
    var fitW = Math.max(1, Math.round(origW * scale));
    var fitH = Math.max(1, Math.round(origH * scale));
    return drawHQ(img, fitW, fitH);
  }

  if (mode === 'fill') {
    // 按比例缩放填满目标框，按 cropFocus 裁剪多余
    var scale = Math.max(targetW / origW, targetH / origH);
    var fillW = Math.max(1, Math.round(origW * scale));
    var fillH = Math.max(1, Math.round(origH * scale));
    var interCanvas = drawHQ(img, fillW, fillH);

    var finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetW; finalCanvas.height = targetH;
    var ctx = finalCanvas.getContext('2d');

    var dx = fillW - targetW, dy = fillH - targetH;
    var f = FOCUS_MAP[cropFocus || 'center'] || FOCUS_MAP['center'];
    var sx = Math.max(0, Math.round(dx * f.x));
    var sy = Math.max(0, Math.round(dy * f.y));

    ctx.drawImage(interCanvas, sx, sy, targetW, targetH, 0, 0, targetW, targetH);
    return finalCanvas;
  }

  // stretch（默认）— 强制拉伸到目标尺寸
  return drawHQ(img, targetW, targetH);
}
```

#### 格式降级处理（Compress 工具）

Canvas `toBlob` 不支持 BMP/GIF/TIFF 输出，需降级并提示用户：

```javascript
// 浏览器不支持的格式静默 fallback
if (targetMime === 'image/bmp') {
  targetMime = 'image/jpeg';
  if (outputFormat !== 'original') formatWarning = 'BMP output not supported — saved as JPEG';
}
if (targetMime === 'image/gif') {
  targetMime = 'image/png';
  if (outputFormat !== 'original') formatWarning = 'GIF output not supported — saved as PNG';
}
if (targetMime === 'image/tiff') {
  targetMime = 'image/jpeg';
  if (outputFormat !== 'original') formatWarning = 'TIFF output not supported — saved as JPEG';
}
```

#### PNG 有损压缩（browser-image-compression）

PNG 为无损格式，Canvas `toBlob('image/png')` 会忽略 `quality` 参数。如需有损压缩 PNG，使用 `browser-image-compression` 库：

```html
<script src="https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js"></script>
```

```javascript
async function compressPNG(file, quality, maxWidth) {
  var options = {
    maxSizeMB: (file.size / (1024 * 1024)) * (1 - quality * 0.6),
    maxWidthOrHeight: maxWidth || 99999,
    useWebWorker: true,
    fileType: 'image/png',
  };
  return await imageCompression(file, options);
}
```

> **注意**：PNG 输出时 quality 滑块应禁用或降低透明度（`opacity: 0.4`），因为浏览器 Canvas 忽略 PNG quality 参数。

#### 基础 Canvas 模式（简单工具）

```javascript
const ImgEngine = (() => {
  const MAX_CANVAS_SIZE = 16384;

  function processImage(file, options) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width > MAX_CANVAS_SIZE || img.height > MAX_CANVAS_SIZE) {
            reject(new Error('Image dimensions exceed browser canvas limit'));
            return;
          }
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          // ... 处理逻辑
          canvas.toBlob((blob) => {
            resolve({ blob, width: canvas.width, height: canvas.height });
          }, options.mimeType, options.quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  return { processImage };
})();
```

### 2.6 批量处理模式

#### 并发处理（Compress 工具）

压缩工具使用**并发池**加速批量处理（默认 4 并发）：

```javascript
const IC_CONCURRENCY = 4;

async function runConcurrent(items, concurrency, fn) {
  const queue = [...items];
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
```

#### 串行处理（Resize 工具）

调整尺寸工具使用**串行处理**避免内存溢出（Canvas 占用大量内存）：

```javascript
async function resizeBatch(files, options, onProgress) {
  var results = [];
  for (var i = 0; i < files.length; i++) {
    try {
      var result = await resizeFile(files[i], options);
      results.push({ ok: true, data: result });
    } catch (e) {
      results.push({ ok: false, file: files[i], error: e.message });
    }
    if (typeof onProgress === 'function') {
      onProgress(i + 1, files.length, results[results.length - 1]);
    }
  }
  return results;
}
```

> **选择原则**：CPU 密集型 + 大内存（Canvas）→ 串行；轻量处理 → 并发。

### 2.7 批量下载（JSZip）

```javascript
async function downloadAllZip() {
  const zip = new JSZip();
  const folder = zip.folder('toolboxnova-images');

  for (const r of STATE.results) {
    if (r.blob) {
      folder.file(r.outputName, r.blob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'toolboxnova-images.zip';
  a.click();
  URL.revokeObjectURL(url);
}
```

**CDN 引入**：在模板中通过 CDN 引入 JSZip（如果项目未内置）：
```html
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
```

---

## 三、后端控制器标准

```go
package image

import (
	"PycMono/github/toolskit/infrastructure/controller/http/render"
	"github.com/gin-gonic/gin"
)

// Img{Tool}Page renders the image {tool} page
func Img{Tool}Page(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("img.{tool}.seo.title"),
		"Description": t("img.{tool}.seo.desc"),
		"Keywords":    "...",
		"PageClass":   "page-img-{tool}",
		"CurrentTool": "{tool}",
	})
	render.Render(c, "img_{tool}.html", data)
}
```

---

## 四、HTML 模板标准结构

```html
{{ template "base" . }}

{{ define "extraHead" }}
<title>{{ .Title }}</title>
<meta name="description" content="{{ .Description }}">
<meta name="keywords"    content="{{ .Keywords }}">
<meta property="og:title"       content="{{ .Title }}">
<meta property="og:description" content="{{ .Description }}">
<meta property="og:type"        content="website">
<meta property="og:url"         content="https://ycjson.top/img/{tool}">
<meta property="og:image"       content="https://ycjson.top/static/og/img-{tool}.png">
<link rel="canonical"    href="https://ycjson.top/img/{tool}">
<link rel="alternate" hreflang="zh" href="https://ycjson.top/img/{tool}?lang=zh">
<link rel="alternate" hreflang="en" href="https://ycjson.top/img/{tool}?lang=en">
<link rel="stylesheet" href="/static/css/img-{tool}.css?v={{ .AssetVer }}">
<link rel="stylesheet" href="/static/css/img-toolbox.css?v={{ .AssetVer }}">
<link rel="stylesheet" href="/static/css/img-tabs.css?v={{ .AssetVer }}">

<!-- ① JSON-LD: SoftwareApplication -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{{ .Title }}",
  "applicationCategory": "MultimediaApplication",
  "operatingSystem": "Web Browser",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "{{ .Description }}",
  "url": "https://ycjson.top/img/{tool}"
}
</script>

<!-- ② JSON-LD: HowTo（适配 Rich Result）-->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "{{ .Title }}",
  "description": "{{ .Description }}",
  "totalTime": "PT2M",
  "estimatedCost": { "@type": "MonetaryAmount", "currency": "USD", "value": "0" },
  "step": [
    {
      "@type": "HowToStep",
      "position": "1",
      "name": "{{ call .T "img.{tool}.s1.step1.title" }}",
      "text": "{{ call .T "img.{tool}.s1.step1.desc" }}",
      "url": "https://ycjson.top/img/{tool}#step-upload"
    },
    {
      "@type": "HowToStep",
      "position": "2",
      "name": "{{ call .T "img.{tool}.s1.step2.title" }}",
      "text": "{{ call .T "img.{tool}.s1.step2.desc" }}",
      "url": "https://ycjson.top/img/{tool}#step-adjust"
    },
    {
      "@type": "HowToStep",
      "position": "3",
      "name": "{{ call .T "img.{tool}.s1.step3.title" }}",
      "text": "{{ call .T "img.{tool}.s1.step3.desc" }}",
      "url": "https://ycjson.top/img/{tool}#step-download"
    }
  ]
}
</script>
{{ end }}

{{ define "content" }}
{{- template "img_tabs" . }}
<div class="itb-page" data-tool="{tool}">

  <!-- Hero -->
  <header class="ic-hero">
    <h1 class="ic-hero__title">{{ call .T "img.{tool}.hero.title" }}</h1>
    <p class="ic-hero__subtitle">{{ call .T "img.{tool}.hero.subtitle" }}</p>
  </header>

  <!-- Upload Zone -->
  <section id="uploadZone" class="upload-zone">
    <input type="file" id="fileInput" multiple accept="image/*" hidden>
    <div class="upload-zone__content">
      <div class="upload-icon">{{ call .T "img.{tool}.upload.icon" }}</div>
      <p class="upload-title">{{ call .T "img.{tool}.upload.title" }}</p>
      <p class="upload-hint">{{ call .T "img.{tool}.upload.hint" }}</p>
      <button class="upload-btn">{{ call .T "img.{tool}.upload.btn" }}</button>
    </div>
  </section>

  <!-- Settings Panel -->
  <section id="settingsPanel" class="settings-panel" style="display:none">
    <!-- 各工具特有设置 -->
  </section>

  <!-- Results -->
  <section id="resultsSection" class="results-section" style="display:none">
    <div id="resultsList"></div>
    <div class="batch-actions">
      <button id="downloadAllBtn">{{ call .T "img.{tool}.download.all" }}</button>
      <button id="clearBtn">{{ call .T "img.{tool}.download.clear" }}</button>
    </div>
  </section>

  <!-- Privacy Notice -->
  <section class="privacy-notice">
    <h3>{{ call .T "img.{tool}.privacy.title" }}</h3>
    <p>{{ call .T "img.{tool}.privacy.desc" }}</p>
  </section>

</div>

<script src="/static/js/img-{tool}-engine.js?v={{ .AssetVer }}"></script>
<script src="/static/js/img-{tool}-ui.js?v={{ .AssetVer }}"></script>
{{ end }}
```

---

## 五、i18n Key 命名规范

图片工具统一使用 `img.{tool}.{area}.{element}` 格式：

```json
{
  "img.{tool}.seo.title": "...",
  "img.{tool}.seo.desc": "...",
  "img.{tool}.hero.title": "...",
  "img.{tool}.hero.subtitle": "...",
  "img.{tool}.upload.title": "Drag and drop images here",
  "img.{tool}.upload.hint": "Supports JPG, PNG, WebP. Max 100MB per file.",
  "img.{tool}.upload.btn": "Select Files",
  "img.{tool}.upload.drop_active": "Release to upload",
  "img.{tool}.options.quality.label": "Quality",
  "img.{tool}.options.format.label": "Output Format",
  "img.{tool}.download.all": "Download All (ZIP)",
  "img.{tool}.download.clear": "Clear and Restart",
  "img.{tool}.privacy.title": "Privacy & Security",
  "img.{tool}.privacy.desc": "All images are processed locally...",
  "img.{tool}.error.too_large": "File exceeds 100MB limit",
  "img.{tool}.error.unsupported_format": "Unsupported image format",
  "img.{tool}.error.canvas_limit": "Image too large for browser processing"
}
```

**注意**：
- 5 种语言文件必须同时更新：`common/i18n/{en,zh,ja,ko,spa}/img.json`
- 翻译必须与实际 UI 文案完全一致
- 文件格式声明文案必须与引擎实际支持能力一致

---

## 六、路由注册

在 `infrastructure/controller/http/router.go` 中添加：

```go
// Image tools
toolsGroup.GET("/media/image-{tool}", image.Img{Tool}Page)
```

或使用独立路由：
```go
r.GET("/img/{tool}", image.Img{Tool}Page)
```

---

## 七、CSS 规范

### 7.1 基础变量与布局

```css
/* img-{tool}.css */

:root {
  --ir-blue:       #2563eb;
  --ir-blue-dark:  #1d4ed8;
  --ir-blue-light: #eff6ff;
  --ir-bg:         #fafaf8;
  --ir-surface:    #ffffff;
  --ir-border:     #e8e4dc;
  --ir-text:       #1a1a1a;
  --ir-text-muted: #72726e;
  --ir-shadow-md:  0 4px 16px rgba(0,0,0,0.08);
  --ir-radius-md:  14px;
}
```

### 7.2 结果卡片（Grid 布局）

实际项目使用 **CSS Grid** 实现结果卡片，而非 Flex：

```css
.ir-result-card {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 14px; align-items: center;
  background: var(--ir-surface);
  border: 1px solid var(--ir-border);
  border-radius: var(--ir-radius-md);
  padding: 14px 16px;
  box-shadow: var(--ir-shadow-md);
  transition: box-shadow 0.2s;
}
.ir-result-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.12); }

.ir-result-card__thumb {
  width: 64px; height: 64px;
  border-radius: 8px; overflow: hidden;
  background: var(--ir-bg);
}
.ir-result-card__thumb img { width: 100%; height: 100%; object-fit: cover; }

/* 移动端：操作按钮换行 */
@media (max-width: 600px) {
  .ir-result-card { grid-template-columns: 48px 1fr; }
  .ir-result-card__actions { grid-column: 1 / -1; justify-content: flex-start; }
}
```

### 7.3 质量滑块（渐变背景）

```css
.ir-quality-slider {
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--ir-blue) 0%,
    var(--ir-blue) var(--slider-pct, 80%),
    #e8e4dc var(--slider-pct, 80%),
    #e8e4dc 100%
  );
  outline: none; cursor: pointer;
}
.ir-quality-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--ir-surface);
  border: 3px solid var(--ir-blue);
  box-shadow: 0 2px 6px rgba(37,99,235,0.3);
  cursor: pointer;
}
```

JS 动态更新 `--slider-pct`：
```javascript
function setSliderBg(s) {
  var pct = ((+s.value - +s.min) / (+s.max - +s.min) * 100).toFixed(1) + '%';
  s.style.setProperty('--slider-pct', pct);
}
```

### 7.4 格式选择卡片（Radio Card）

```css
.ir-format-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ir-format-card input[type="radio"] { display: none; }
.ir-format-card__inner {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 8px;
  border: 1.5px solid var(--ir-border);
  border-radius: var(--ir-radius-sm);
  cursor: pointer; transition: all 0.15s; text-align: center;
}
.ir-format-card input:checked + .ir-format-card__inner {
  border-color: var(--ir-blue);
  background: var(--ir-blue-light);
  box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}
.ir-format-card--recommended .ir-format-card__inner { border-color: #93c5fd; }
.ir-format-card__tag {
  position: absolute; top: -8px; right: -6px;
  background: var(--ir-blue); color: #fff;
  font-size: 0.6rem; font-weight: 700;
  padding: 1px 6px; border-radius: 999px;
}
```

### 7.5 移动端断点

实际项目使用多级断点（非单一 640px）：

```css
@media (max-width: 900px) {
  .ir-sidebar { display: none; }
  .ir-drop-layout { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .ir-hero__title { font-size: 1.75rem; }
  .ir-format-options { grid-template-columns: repeat(2, 1fr); }
  .ir-preset-grid    { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .ir-result-card { grid-template-columns: 48px 1fr; }
}
@media (max-width: 480px) {
  .ir-hero__title   { font-size: 1.5rem; }
  .ir-dimension-row { flex-wrap: wrap; }
}
```

---

## 八、常见图片工具实现要点

### 8.1 图片压缩（compress）
- 使用 Canvas `toBlob(quality)` 控制质量
- 支持格式转换：JPG/PNG/WebP/GIF/BMP/TIFF（BMP/GIF/TIFF 输出会降级到 JPEG/PNG 并提示用户）
- PNG 特殊处理：Canvas `toBlob('image/png')` 忽略 quality，需用 `browser-image-compression` 库实现有损压缩
- 并发处理：默认 4 并发加速批量压缩
- 展示压缩前后文件大小对比和压缩率
- 使用 `saveAs`（FileSaver.js）或 `a[download]` 实现下载

### 8.2 图片调整尺寸（resize）
- 支持像素输入、百分比缩放、预设尺寸三种模式
- 保持宽高比（默认开启），带锁定按钮
- 三种 Resize 模式：Stretch（拉伸）、Fit（适应）、Fill（裁剪填充）
- Fill 模式支持 9 点裁剪焦点（center/top/bottom/left/right/4 角）
- 高质量下采样：Lanczos-like 分步缩放（每步不超过 50%）
- 串行处理避免内存溢出
- Before/After 滑块对比预览
- 显示原始尺寸 → 目标尺寸 → 缩放比例

### 8.3 图片格式转换
- 输入格式 → Canvas → 输出格式
- PNG 保留透明通道，JPG 不支持透明
- WebP 为推荐网页格式

### 8.4 批量处理
- 统一设置应用到所有文件
- 队列展示：缩略图 + 文件名 + 状态
- ZIP 打包下载

### 8.5 Before/After 对比预览（Resize 工具）

```html
<div class="ir-slider-compare" id="irSliderCompare">
  <img class="ir-compare-img ir-compare-img--after" src="{{afterUrl}}" alt="after">
  <div class="ir-compare-before-wrap" id="irBeforeWrap" style="width:50%">
    <img class="ir-compare-img ir-compare-img--before" src="{{beforeUrl}}" alt="before">
  </div>
  <div class="ir-compare-divider" id="irCompareDivider" style="left:50%">
    <div class="ir-compare-handle"></div>
  </div>
</div>
```

```css
.ir-slider-compare {
  position: relative; flex: 1; overflow: hidden;
  cursor: ew-resize; background: #1a1a1a;
  min-height: 280px; max-height: 50vh;
}
.ir-compare-img {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%; object-fit: contain;
}
.ir-compare-before-wrap {
  position: absolute; top: 0; left: 0;
  height: 100%; overflow: hidden; z-index: 2;
}
.ir-compare-divider {
  position: absolute; top: 0; bottom: 0; width: 3px;
  background: #fff; z-index: 10; transform: translateX(-50%);
  cursor: ew-resize;
}
```

```javascript
function bindSliderEvents(cId, dId, wId) {
  var cmp = document.getElementById(cId), div = document.getElementById(dId), wrap = document.getElementById(wId);
  if (!cmp || !div || !wrap) return;
  var drag = false;
  var setPos = function (x) {
    var r = cmp.getBoundingClientRect();
    var p = Math.max(2, Math.min(98, (x - r.left) / r.width * 100));
    div.style.left = p + '%'; wrap.style.width = p + '%';
  };
  div.addEventListener('mousedown',  function (e) { drag = true; e.preventDefault(); });
  document.addEventListener('mousemove', function (e) { if (drag) setPos(e.clientX); });
  document.addEventListener('mouseup',   function ()  { drag = false; });
  div.addEventListener('touchstart', function (e) { drag = true; e.preventDefault(); });
  document.addEventListener('touchmove', function (e) { if (drag) setPos(e.touches[0].clientX); }, { passive: false });
  document.addEventListener('touchend',  function ()  { drag = false; });
}
```

### 8.6 Tab 导航（img-tabs）

所有图片工具共享 `img-tabs.css` + `img-tabs.js` 的 Tab 导航：

```html
{{ define "content" }}
{{- template "img_tabs" . }}
<div class="itb-page" data-tool="{tool}">
  ...
</div>
{{ end }}
```

在 `extraScript` 中加载：
```html
<script src="/static/js/img-tabs.js?v={{ .AssetVer }}"></script>
```

---

## 九、不要做的事情

- **不要把大量 SEO 长文堆在工具首屏** — 指南页单独做
- **不要声称「无损放大」或「100% 不损失质量」** — 小图放大会模糊
- **不要声明 UI 不支持的格式** — UI 文案和引擎能力必须一致
- **不要忽略浏览器 Canvas 尺寸限制** — 超大图需要降级提示
- **不要牺牲移动端可用性** — 上传按钮不小于 44px，支持横滑预设
- **不要把文件上传到服务器** — 除非明确需要后端处理（如 OCR）
