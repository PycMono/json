---
name: frontend-patterns
description: ToolboxNova 前端 UI 组件模式技能。当用户提到以下任意情况时立即激活：「拖拽上传」「复制按钮」「下载按钮」「Toast 通知」「文件列表」「结果卡片」「Tab 切换」「折叠面板」「进度条」「Loading 状态」「模态框」「移动端适配」「暗色模式」「主题切换」。激活后输出可直接复制使用的原生 JavaScript + Tailwind CSS 代码片段。
type: project
---

# ToolboxNova 前端 UI 组件模式库

## 角色定义

你是一位 ToolboxNova 前端组件工程师。项目使用 **原生 JavaScript + Tailwind CSS + Go html/template**，无 React/Vue 等框架。所有组件必须是自包含的、可直接复制到 `.js` / `.css` / `.html` 文件中使用的代码。

## 项目约束

- **无构建工具**：不能使用 JSX、SFC、CSS Modules
- **Go 模板**：HTML 使用 `{{ define }}` / `{{ template }}` 语法
- **5 语言**：文案通过 `{{ call .T "key" }}` 注入
- **缓存**：静态资源 `?v={{ .AssetVer }}`
- **暗色模式**：通过 `data-theme="dark"` 切换（已内建在 base.html）

---

## 一、拖拽上传区（Dropzone）

### HTML

```html
<div id="dropZone" class="dropzone">
  <input type="file" id="fileInput" multiple accept="image/*" hidden>
  <div class="dropzone__inner">
    <svg class="dropzone__icon" viewBox="0 0 24 24"><!-- upload icon --></svg>
    <p class="dropzone__title">{{ call .T "common.dropzone.title" }}</p>
    <p class="dropzone__hint">{{ call .T "common.dropzone.hint" }}</p>
    <button type="button" class="dropzone__btn">{{ call .T "common.dropzone.btn" }}</button>
  </div>
</div>
```

### CSS

```css
.dropzone {
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
  background: #fff;
}
.dropzone:hover,
.dropzone.drag-over {
  border-color: #2563eb;
  background: #eff6ff;
}
.dropzone__icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  color: #94a3b8;
}
.dropzone:hover .dropzone__icon,
.dropzone.drag-over .dropzone__icon {
  color: #2563eb;
}
.dropzone__title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 4px;
}
.dropzone__hint {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 16px;
}
.dropzone__btn {
  padding: 8px 20px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
@media (max-width: 640px) {
  .dropzone { padding: 32px 16px; }
}
```

### JS

```javascript
function initDropzone(options) {
  const zone = document.getElementById(options.zoneId || 'dropZone');
  const input = document.getElementById(options.inputId || 'fileInput');

  if (!zone || !input) return;

  zone.addEventListener('click', (e) => {
    if (e.target.closest('.dropzone__btn, .dropzone__inner')) input.click();
  });

  input.addEventListener('change', (e) => {
    if (e.target.files.length) options.onFiles(e.target.files);
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    zone.addEventListener(eventName, () => zone.classList.add('drag-over'));
  });

  ['dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, () => zone.classList.remove('drag-over'));
  });

  zone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) options.onFiles(e.dataTransfer.files);
  });

  // 粘贴支持（可选）
  if (options.paste !== false) {
    document.addEventListener('paste', (e) => {
      if (e.clipboardData.files.length) {
        options.onFiles(e.clipboardData.files);
      }
    });
  }
}

// 使用
initDropzone({
  onFiles: (files) => handleFiles(files),
});
```

---

## 二、文件列表 / 结果卡片

### HTML

```html
<div id="resultsList" class="results-list"></div>
```

### CSS

```css
.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.result-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: box-shadow 0.2s;
}
.result-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.result-card__thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
.result-card__info {
  flex: 1;
  min-width: 0;
}
.result-card__name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.result-card__meta {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}
.result-card__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.result-card__btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}
.result-card__btn--download {
  background: #2563eb;
  color: #fff;
}
.result-card__btn--delete {
  background: #fef2f2;
  color: #dc2626;
}
@media (max-width: 640px) {
  .result-card { flex-direction: column; align-items: flex-start; }
  .result-card__actions { width: 100%; }
  .result-card__btn { flex: 1; }
}
```

### JS

```javascript
function renderResultCard(data) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.id = 'result-' + data.id;
  card.innerHTML = `
    ${data.thumb ? `<img class="result-card__thumb" src="${esc(data.thumb)}" alt="">` : ''}
    <div class="result-card__info">
      <div class="result-card__name">${esc(data.name)}</div>
      <div class="result-card__meta">${esc(data.meta)}</div>
    </div>
    <div class="result-card__actions">
      <button class="result-card__btn result-card__btn--download" data-id="${data.id}">Download</button>
      <button class="result-card__btn result-card__btn--delete" data-id="${data.id}">Delete</button>
    </div>
  `;
  return card;
}
```

---

## 三、复制到剪贴板

```javascript
async function copyToClipboard(text, buttonEl) {
  try {
    await navigator.clipboard.writeText(text);
    showCopyFeedback(buttonEl);
  } catch (err) {
    // 降级方案
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyFeedback(buttonEl);
  }
}

function showCopyFeedback(btn) {
  const original = btn.textContent;
  btn.textContent = 'Copied!';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1500);
}
```

---

## 四、下载按钮（单文件 + ZIP）

```javascript
// 单文件下载
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 批量 ZIP 下载（需要 JSZip）
async function downloadZip(files, zipName) {
  const zip = new JSZip();
  files.forEach(f => zip.file(f.name, f.blob));
  const content = await zip.generateAsync({ type: 'blob' });
  downloadFile(content, zipName);
}
```

---

## 五、Toast 通知

```javascript
const Toast = (() => {
  let container;

  function getContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(container);
    return container;
  }

  function show(message, type = 'info') {
    const colors = {
      success: '#16a34a',
      error: '#dc2626',
      warning: '#b45309',
      info: '#334155',
    };

    const el = document.createElement('div');
    el.style.cssText = `
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      background: ${colors[type] || colors.info};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s ease;
      pointer-events: auto;
      max-width: 320px;
      word-break: break-word;
    `;
    el.textContent = message;

    getContainer().appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    const duration = type === 'error' ? 6000 : 3000;
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  return { show };
})();

// 使用
Toast.show('Processing complete', 'success');
Toast.show('Something went wrong', 'error');
```

---

## 六、Tab 切换

```javascript
function initTabs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const tabs = container.querySelectorAll('[data-tab]');
  const panels = container.querySelectorAll('[data-tab-panel]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
      panels.forEach(p => {
        p.style.display = p.dataset.tabPanel === target ? 'block' : 'none';
      });
    });
  });
}

// HTML 结构
// <div class="tabs">
//   <button class="tab active" data-tab="text">Text</button>
//   <button class="tab" data-tab="file">File</button>
// </div>
// <div data-tab-panel="text">...</div>
// <div data-tab-panel="file" style="display:none">...</div>
```

---

## 七、折叠面板（FAQ）

```css
.faq-item {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;
}
.faq-item summary {
  padding: 14px 18px;
  cursor: pointer;
  font-weight: 500;
  color: #1e293b;
  background: #f8fafc;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.faq-item summary::after {
  content: '+';
  font-size: 20px;
  color: #94a3b8;
  transition: transform 0.2s;
}
.faq-item[open] summary::after {
  content: '−';
  transform: rotate(180deg);
}
.faq-item__content {
  padding: 14px 18px;
  color: #475569;
  line-height: 1.7;
}
```

---

## 八、进度条

```css
.progress-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar__fill {
  height: 100%;
  background: #2563eb;
  border-radius: 3px;
  transition: width 0.3s ease;
}
```

```html
<div class="progress-bar">
  <div class="progress-bar__fill" style="width: 45%"></div>
</div>
```

---

## 九、Loading 状态

```css
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 十、暗色模式适配

项目 base.html 已设置 `data-theme="dark"`，CSS 中使用：

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border: #334155;
}

.component {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
```

---

## 十一、移动端通用适配

```css
@media (max-width: 640px) {
  /* 触控区域不小于 44px */
  button, a, input, select, textarea {
    min-height: 44px;
  }

  /* 防止横向溢出 */
  body { overflow-x: hidden; }

  /* 单列布局 */
  .two-column { flex-direction: column; }

  /* 全宽按钮 */
  .btn-group { flex-direction: column; }
  .btn-group button { width: 100%; }

  /* 横向滚动容器 */
  .scroll-x {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .scroll-x::-webkit-scrollbar { display: none; }

  /* 字体大小 */
  body { font-size: 15px; }
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
}
```

---

## 十二、Before/After 图片对比滑块

```html
<div class="compare-slider" id="compareSlider">
  <img class="compare-img compare-img--after" src="{{afterUrl}}" alt="after">
  <div class="compare-before-wrap" id="beforeWrap" style="width:50%">
    <img class="compare-img compare-img--before" src="{{beforeUrl}}" alt="before">
  </div>
  <div class="compare-divider" id="compareDivider" style="left:50%">
    <div class="compare-handle"></div>
  </div>
</div>
```

```css
.compare-slider {
  position: relative; overflow: hidden;
  cursor: ew-resize; background: #1a1a1a;
  min-height: 280px; max-height: 50vh;
}
.compare-img {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%; object-fit: contain;
  user-select: none; pointer-events: none;
}
.compare-before-wrap {
  position: absolute; top: 0; left: 0;
  height: 100%; overflow: hidden; z-index: 2;
}
.compare-before-wrap .compare-img--before {
  position: absolute; top: 0; left: 0;
  min-width: var(--compare-full-width, 860px);
  height: 100%;
}
.compare-divider {
  position: absolute; top: 0; bottom: 0; width: 3px;
  background: #fff; z-index: 10; transform: translateX(-50%);
  cursor: ew-resize; box-shadow: 0 0 8px rgba(0,0,0,0.5);
}
.compare-handle {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 44px; height: 44px; background: #fff;
  border-radius: 50%; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
}
```

```javascript
function bindCompareSlider(sliderId, dividerId, wrapId) {
  const slider = document.getElementById(sliderId);
  const divider = document.getElementById(dividerId);
  const wrap = document.getElementById(wrapId);
  if (!slider || !divider || !wrap) return;
  slider.style.setProperty('--compare-full-width', slider.offsetWidth + 'px');
  let drag = false;
  const setPos = (x) => {
    const r = slider.getBoundingClientRect();
    const p = Math.max(2, Math.min(98, (x - r.left) / r.width * 100));
    divider.style.left = p + '%';
    wrap.style.width = p + '%';
  };
  divider.addEventListener('mousedown', (e) => { drag = true; e.preventDefault(); });
  document.addEventListener('mousemove', (e) => { if (drag) setPos(e.clientX); });
  document.addEventListener('mouseup', () => { drag = false; });
  divider.addEventListener('touchstart', (e) => { drag = true; e.preventDefault(); });
  document.addEventListener('touchmove', (e) => { if (drag) setPos(e.touches[0].clientX); }, { passive: false });
  document.addEventListener('touchend', () => { drag = false; });
}
```

---

## 十三、质量滑块（CSS 渐变背景）

```css
.quality-slider {
  -webkit-appearance: none; height: 6px;
  border-radius: 999px; outline: none; cursor: pointer;
  background: linear-gradient(
    to right,
    var(--primary) 0%,
    var(--primary) var(--slider-pct, 80%),
    #e2e8f0 var(--slider-pct, 80%),
    #e2e8f0 100%
  );
}
.quality-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: #fff; border: 3px solid var(--primary);
  box-shadow: 0 2px 6px rgba(37,99,235,0.3);
  cursor: pointer;
}
```

```javascript
function setSliderBg(slider) {
  const pct = ((+slider.value - +slider.min) / (+slider.max - +slider.min) * 100).toFixed(1) + '%';
  slider.style.setProperty('--slider-pct', pct);
}
// 初始化 + 事件
setSliderBg(slider);
slider.addEventListener('input', () => setSliderBg(slider));
```

---

## 十四、格式选择卡片（Radio Card）

```html
<div class="format-options">
  <label class="format-card">
    <input type="radio" name="outputFormat" value="original" checked hidden>
    <div class="format-card__inner">
      <span class="format-card__icon">📄</span>
      <span class="format-card__name">Original</span>
    </div>
  </label>
  <label class="format-card format-card--recommended">
    <input type="radio" name="outputFormat" value="webp" hidden>
    <div class="format-card__inner">
      <span class="format-card__icon">🚀</span>
      <span class="format-card__name">WebP</span>
      <span class="format-card__tag">Recommended</span>
    </div>
  </label>
</div>
```

```css
.format-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.format-card input[type="radio"] { display: none; }
.format-card__inner {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 8px;
  border: 1.5px solid #e2e8f0; border-radius: 8px;
  cursor: pointer; transition: all 0.15s; text-align: center;
  position: relative;
}
.format-card input:checked + .format-card__inner {
  border-color: #2563eb; background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}
.format-card--recommended .format-card__inner { border-color: #93c5fd; }
.format-card__tag {
  position: absolute; top: -8px; right: -6px;
  background: #2563eb; color: #fff;
  font-size: 0.6rem; font-weight: 700;
  padding: 1px 6px; border-radius: 999px;
}
```

---

## 十五、Grid 结果卡片（图片工具专用）

```css
.result-card {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 14px; align-items: center;
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 12px; padding: 14px 16px;
}
.result-card__thumb {
  width: 64px; height: 64px;
  border-radius: 8px; overflow: hidden;
}
.result-card__thumb img { width: 100%; height: 100%; object-fit: cover; }
.result-card__body { min-width: 0; }
.result-card__name {
  font-size: 0.875rem; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.result-card__actions {
  display: flex; align-items: center; gap: 6px;
  flex-shrink: 0; flex-wrap: wrap;
}
/* 移动端 */
@media (max-width: 600px) {
  .result-card { grid-template-columns: 48px 1fr; }
  .result-card__actions { grid-column: 1 / -1; justify-content: flex-start; }
}
```

---

## 十六、通用工具函数

```javascript
// 防抖
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// 节流
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}

// XSS 转义
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 文件大小格式化
function fmtBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0) + ' ' + units[i];
}

// 本地存储（带异常处理）
function storageGet(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) { return fallback; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { /* ignore */ }
}
```

---

## 十七、不要做的事情

- **不要用 emoji 替代专业图标** — 使用 SVG 或图标字体
- **不要用 `alert()` / `confirm()`** — 使用 Toast 或自定义模态框
- **不要依赖特定浏览器的 API 而不做特性检测** — 如 `navigator.clipboard` 需要 fallback
- **不要把所有逻辑放在一个巨大的函数里** — 按功能拆分小函数
- **不要忽略 `data-theme="dark"`** — 新组件必须测试暗色模式
- **不要使用第三方 UI 库** — 保持原生实现，减少依赖
