---
name: dev-tools
description: ToolboxNova 开发者工具开发技能。当用户提到以下任意情况时立即激活：「开发者工具」「dev tool」「base64」「hash」「url encode」「word counter」「ip lookup」「whois」「user agent」「编码解码」「进制转换」「正则表达式」「时间戳」「markdown」。激活后输出可直接落地的控制器、模板、JS、CSS 和 i18n 配置。
type: project
---

# ToolboxNova 开发者工具开发规范

## 角色定义

你是一位熟悉 ToolboxNova 开发者工具体系的前端工程师。你理解纯前端处理架构、文本编码解码、哈希算法、进制转换等常见开发需求的技术实现。

当前项目已有的开发者工具：Base64 编解码、哈希计算(MD5/SHA 系列/CRC32)、URL 编解码、IP 查询、Whois、User-Agent 解析、字数统计、正则测试、时间戳转换、Markdown 预览、进制转换、大小写转换。

## 项目约束（开发前必读）

- **纯前端处理**：数据不上传服务器，全部在浏览器完成
- **技术栈**：Go 1.25 + Gin + Go html/template + 原生 JavaScript + Tailwind CSS
- **5 语言**：zh / en / ja / ko / spa
- **模块路径**：`PycMono/github/toolskit`
- **渲染**：`render.Render()` 动态解析模板
- **安全**：防止 XSS，用户输入必须转义后展示

---

## 一、开发者工具类型判断

| 类型 | 特征 | 示例 |
|------|------|------|
| **A. 编解码转换** | 输入 → 算法变换 → 输出 | base64, url-encode, html-encode |
| **B. 哈希/摘要** | 输入 → 哈希计算 → 输出摘要 | md5, sha256, crc32 |
| **C. 网络查询** | 输入 → 后端/第三方 API → 结果 | ip-lookup, whois |
| **D. 文本处理** | 输入 → 文本分析 → 统计/格式化 | word-counter, case-converter |
| **E. 代码辅助** | 输入 → 结构化处理 → 格式化输出 | json-format, markdown-preview, regex-test |

---

## 二、前端架构标准

### 2.1 文件结构

```
frontend/static/js/dev-{tool}.js          # UI + 处理逻辑（纯前端工具合并在一个文件）
frontend/static/css/dev-{tool}.css        # 工具专属样式
frontend/static/css/dev-tools.css         # 开发者工具公共样式（已存在，复用）
frontend/templates/dev/{tool}.html        # 工具页面
frontend/templates/dev/{tool}-guide.html  # 可选：SEO 指南页
```

### 2.2 JS 架构模式（纯前端）

开发者工具使用 **State + Engine 合一** 的紧凑模式：

```javascript
// dev-{tool}.js
const Dev{Tool} = (() => {
  'use strict';

  // ── State ──
  const STATE = {
    input: '',
    fileBuffer: null,
    fileName: '',
    activeTab: 'text',     // text | file
    format: 'hex_lower',   // 输出格式选项
    debounceTimer: null,
    DEBOUNCE_MS: 250,
    results: {},
  };

  // ── Init ──
  function init() {
    bindEvents();
    loadHistory();
  }

  // ── Event Binding ──
  function bindEvents() {
    // Tab 切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 输入处理（带防抖）
    const input = document.getElementById('inputArea');
    input.addEventListener('input', () => {
      clearTimeout(STATE.debounceTimer);
      STATE.debounceTimer = setTimeout(() => {
        STATE.input = input.value;
        process();
      }, STATE.DEBOUNCE_MS);
    });

    // 文件上传
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFile);

    // 格式切换
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        STATE.format = btn.dataset.format;
        process();
      });
    });

    // 复制按钮
    document.getElementById('copyBtn').addEventListener('click', copyResult);

    // 清空按钮
    document.getElementById('clearBtn').addEventListener('click', clearAll);
  }

  // ── Processing ──
  function process() {
    if (STATE.activeTab === 'file' && STATE.fileBuffer) {
      STATE.results = computeFromBuffer(STATE.fileBuffer);
    } else if (STATE.input) {
      STATE.results = computeFromText(STATE.input);
    }
    renderResults();
    saveHistory();
  }

  function computeFromText(text) {
    // 核心算法实现
    return {
      result1: algorithm1(text),
      result2: algorithm2(text),
    };
  }

  // ── File Handling ──
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB max
      showError('File too large');
      return;
    }
    STATE.fileName = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      STATE.fileBuffer = ev.target.result;
      process();
    };
    reader.readAsArrayBuffer(file);
  }

  // ── UI Updates ──
  function renderResults() {
    // 更新结果区域
  }

  function switchTab(tab) {
    STATE.activeTab = tab;
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.style.display = p.dataset.tab === tab ? 'block' : 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
  }

  // ── History ──
  function loadHistory() {
    try {
      const raw = localStorage.getItem('dev{tool}_history');
      if (raw) STATE.history = JSON.parse(raw);
    } catch (e) {}
  }

  function saveHistory() {
    const item = { input: STATE.input.slice(0, 1000), timestamp: Date.now() };
    STATE.history = [item, ...STATE.history.slice(0, 19)]; // 保留 20 条
    localStorage.setItem('dev{tool}_history', JSON.stringify(STATE.history));
  }

  // ── Utilities ──
  // 通用工具函数参考 frontend-patterns 技能：
  // - copyToClipboard()  → 剪贴板复制（含 fallback）
  // - Toast.show()       → 通知提示（含颜色主题、动画）
  // - debounce()         → 输入防抖
  // - esc()              → XSS 转义

  async function copyResult() {
    const text = document.getElementById('resultArea').textContent;
    await navigator.clipboard.writeText(text);
    Toast.show('Copied!', 'success');
  }

  function clearAll() {
    STATE.input = '';
    STATE.fileBuffer = null;
    STATE.results = {};
    document.getElementById('inputArea').value = '';
    renderResults();
  }

  function showError(msg) {
    const el = document.getElementById('errorArea');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Dev{Tool}.init);
```

### 2.3 哈希类工具特殊规范

```javascript
// dev-hash.js 的 STATE 示例
const STATE = {
  text: '',
  fileBuffer: null,
  fileName: '',
  format: 'hex_lower', // hex_lower | hex_upper | base64
  activeTab: 'text',
  debounceTimer: null,
  DEBOUNCE_MS: 250,
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  HISTORY_KEY: 'devhash_history_v2',
  MAX_HISTORY: 20,
  results: { md5: '', sha1: '', sha256: '', sha512: '', crc32: '' },
};

// 算法列表
const ALGOS = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'crc32'];

// CRC32 纯 JS 实现（如果不用库）
const _crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  const bytes = new Uint8Array(buffer);
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = _crc32Table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  crc ^= 0xFFFFFFFF;
  return (crc >>> 0).toString(16).padStart(8, '0');
}
```

### 2.4 网络查询类工具特殊规范

```javascript
// 需要后端 API 的 dev 工具（如 IP lookup, Whois）
async function lookupIP(ip) {
  const res = await fetch(`/api/ip-lookup?ip=${encodeURIComponent(ip)}`);
  if (!res.ok) throw new Error('Lookup failed');
  return await res.json();
}

// 前端展示
function renderIPResult(data) {
  return `
    <div class="ip-result">
      <div class="ip-row"><span>IP:</span> <code>${esc(data.ip)}</code></div>
      <div class="ip-row"><span>Country:</span> ${esc(data.country)}</div>
      <div class="ip-row"><span>ISP:</span> ${esc(data.isp)}</div>
    </div>
  `;
}
```

---

## 三、后端控制器标准

```go
package tools

import (
	"PycMono/github/toolskit/common/faq"
	"PycMono/github/toolskit/infrastructure/controller/http/render"
	"github.com/gin-gonic/gin"
)

// Dev{Tool}Page serves /dev/{tool}
func Dev{Tool}Page(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.{tool}.title"),
		"Description": t("seo.{tool}.description"),
		"Keywords":    t("seo.{tool}.keywords"),
		"Canonical":   "https://ycjson.top/dev/{tool}",
		"HreflangZH":  "https://ycjson.top/dev/{tool}?lang=zh",
		"HreflangEN":  "https://ycjson.top/dev/{tool}?lang=en",
		"OGImage":     "https://ycjson.top/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "{tool}"),
		"PageClass":   "page-dev-{tool}",
		"ToolName":    "{tool}",
	})
	renderDevTool(c, "dev/{tool}.html", data)
}
```

注意：`renderDevTool` 是 `tools` 包内的辅助函数，用于开发者工具的统一渲染。

---

## 四、HTML 模板标准

```html
{{ template "base" . }}

{{ define "extraHead" }}
<title>{{ .Title }}</title>
<meta name="description" content="{{ .Description }}">
<meta name="keywords" content="{{ .Keywords }}">
<link rel="canonical" href="https://ycjson.top/dev/{tool}">
<link rel="alternate" hreflang="zh" href="https://ycjson.top/dev/{tool}?lang=zh">
<link rel="alternate" hreflang="en" href="https://ycjson.top/dev/{tool}?lang=en">
<link rel="stylesheet" href="/static/css/dev-{tool}.css?v={{ .AssetVer }}">
<link rel="stylesheet" href="/static/css/dev-tools.css?v={{ .AssetVer }}">
{{ end }}

{{ define "content" }}
<div class="dev-tool-page page-dev-{tool}">

  <!-- Hero -->
  <header class="dev-hero">
    <h1>{{ call .T "{tool}.title" }}</h1>
    <p>{{ call .T "{tool}.subtitle" }}</p>
  </header>

  <!-- Tool Workspace -->
  <div class="dev-workspace">

    <!-- Tabs -->
    <div class="dev-tabs">
      <button class="tab-btn active" data-tab="text">{{ call .T "{tool}.tab.text" }}</button>
      <button class="tab-btn" data-tab="file">{{ call .T "{tool}.tab.file" }}</button>
    </div>

    <!-- Text Input Panel -->
    <div class="tab-panel" data-tab="text">
      <textarea id="inputArea" class="dev-input" placeholder="{{ call .T "{tool}.input.placeholder" }}"></textarea>
      <div class="dev-actions">
        <button id="clearBtn" class="btn-secondary">{{ call .T "common.clear" }}</button>
        <button id="copyBtn" class="btn-primary">{{ call .T "common.copy" }}</button>
      </div>
    </div>

    <!-- File Input Panel -->
    <div class="tab-panel" data-tab="file" style="display:none">
      <input type="file" id="fileInput">
      <div id="fileInfo"></div>
    </div>

    <!-- Format Selector -->
    <div class="dev-format-bar">
      <span class="format-label">{{ call .T "{tool}.format.label" }}:</span>
      <button class="format-btn active" data-format="hex_lower">hex</button>
      <button class="format-btn" data-format="hex_upper">HEX</button>
      <button class="format-btn" data-format="base64">Base64</button>
    </div>

    <!-- Results -->
    <div class="dev-results">
      <div id="resultArea" class="result-output"></div>
    </div>

    <!-- Error Area -->
    <div id="errorArea" class="dev-error" style="display:none"></div>

  </div>

  <!-- SEO Article -->
  {{ if .SEOArticle }}
  <article class="dev-guide">
    {{ .SEOArticle }}
  </article>
  {{ end }}

  <!-- FAQ -->
  {{ if .FAQs }}
  <section class="dev-faq">
    <h2>{{ call .T "common.faq" }}</h2>
    {{ range .FAQs }}
    <details>
      <summary>{{ .Question }}</summary>
      <div>{{ .Answer }}</div>
    </details>
    {{ end }}
  </section>
  {{ end }}

</div>

<script src="/static/js/dev-{tool}.js?v={{ .AssetVer }}"></script>
{{ end }}
```

---

## 五、i18n Key 命名规范

开发者工具使用 `{tool}.{area}.{element}` 格式：

```json
{
  "{tool}.seo.title": "Online {Tool} — Free Developer Utility | ToolboxNova",
  "{tool}.seo.description": "...",
  "{tool}.seo.keywords": "...",
  "{tool}.title": "{Tool} Tool",
  "{tool}.subtitle": "...",
  "{tool}.tab.text": "Text",
  "{tool}.tab.file": "File",
  "{tool}.input.placeholder": "Enter text here...",
  "{tool}.format.label": "Output Format",
  "{tool}.result.empty": "Enter input to see results",
  "{tool}.error.empty": "Input cannot be empty",
  "{tool}.error.too_large": "File exceeds 2GB limit",
  "common.clear": "Clear",
  "common.copy": "Copy",
  "common.faq": "FAQ"
}
```

---

## 六、CSS 规范

```css
/* dev-{tool}.css */

/* ── Page ── */
.dev-tool-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* ── Hero ── */
.dev-hero {
  text-align: center;
  margin-bottom: 24px;
}
.dev-hero h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}
.dev-hero p {
  color: #64748b;
  margin-top: 4px;
}

/* ── Workspace ── */
.dev-workspace {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}

/* ── Tabs ── */
.dev-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}
.tab-btn {
  padding: 8px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
}
.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: 600;
}

/* ── Input ── */
.dev-input {
  width: 100%;
  min-height: 160px;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 14px;
  resize: vertical;
}

/* ── Format Bar ── */
.dev-format-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 8px 0;
  border-top: 1px solid #e2e8f0;
}
.format-btn {
  padding: 4px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.format-btn.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

/* ── Results ── */
.dev-results {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  min-height: 80px;
}
.result-output {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 14px;
  word-break: break-all;
  white-space: pre-wrap;
}

/* ── Actions ── */
.dev-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
.btn-primary {
  padding: 8px 20px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary {
  padding: 8px 20px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
}

/* ── Error ── */
.dev-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .dev-workspace { padding: 16px; }
  .dev-tabs { overflow-x: auto; }
  .dev-actions { flex-direction: column; }
  .btn-primary, .btn-secondary { width: 100%; justify-content: center; }
}
```

---

## 七、路由注册

```go
// infrastructure/controller/http/router.go
r.GET("/dev/{tool}", tools.Dev{Tool}Page)
r.GET("/dev/{tool}-guide", tools.Dev{Tool}GuidePage) // 可选

// API（仅网络查询类需要）
r.GET("/api/{tool}-lookup", tools.{Tool}LookupAPI)
```

---

## 八、安全注意事项

```javascript
// 所有用户输入在展示前必须转义
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 结果展示时
resultArea.innerHTML = esc(result);
// 不要直接用 innerHTML = result（XSS 风险）
```

---

## 九、不要做的事情

- **不要把用户数据发送到后端** — 开发者工具必须是纯前端处理（网络查询类除外）
- **不要用 `innerHTML` 直接插入未转义的用户输入** — 必须转义或使用 `textContent`
- **不要把密钥或算法密钥硬编码在 JS 中** — 哈希算法的常量除外
- **不要阻塞主线程处理大文件** — 超过 10MB 的文件考虑使用 Web Worker
- **不要忘记防抖** — 文本输入必须 debounce（250ms）
- **不要忽略文件大小限制** — 明确提示最大 2GB
