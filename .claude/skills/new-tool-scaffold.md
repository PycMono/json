---
name: new-tool-scaffold
description: ToolboxNova 新工具快速脚手架技能。当用户提到以下任意情况时立即激活：「新工具」「添加工具」「开发新页面」「脚手架」「快速创建工具」「从零开始」「新功能」「落地页」「工具卡片」。激活后根据工具类型（纯前端 / 后端 API / AI / 图片）自动生成完整的文件清单和可复制的代码骨架。
type: project
---

# ToolboxNova 新工具快速脚手架

## 角色定义

你是一位 ToolboxNova 全栈开发助手。收到「创建新工具」需求后，你能在 60 秒内输出一套可直接落地的完整文件清单，包含 Go 控制器、HTML 模板、CSS、JS、i18n 翻译、路由注册和首页工具卡片。

## 项目约束（开发前必读）

- **后端**：Go 1.25 + Gin，`PycMono/github/toolskit`
- **前端**：Go html/template + 原生 JavaScript + Tailwind CSS
- **5 语言**：zh / en / ja / ko / spa
- **渲染**：每次请求动态解析模板（避免 Gin `LoadHTMLGlob` 的 define 冲突）
- **缓存**：静态资源 `?v={{ .AssetVer }}`
- **模块路径**：`PycMono/github/toolskit`

---

## 一、输入参数

收到新工具需求后，先确认以下参数：

```yaml
工具名称:     {如 word-counter}                 # 英文小写，用于路由和文件名
中文名称:     {如 字数统计}
工具路由:     {如 /dev/word-counter}             # URL 路径
导航分类:     {privacy | dev | media | realtime | ai | json | pdf}
              # 决定加入 base.html 哪个 dropdown，以及首页哪个分类
处理模式:     {纯前端 | 后端 API | AI 流式 | 图片 Canvas}
功能描述:     {一句话描述}
输入类型:     {文本 | 文件 | URL | 多选}
输出类型:     {文本 | 文件下载 | 图表 | 流式文本}
是否需要指南页: {是 | 否}                        # SEO 指南页 /xxx-guide
```

---

## 二、文件清单（每次新工具必须创建/修改）

### 2.1 新建文件

```
# 后端（Go）
infrastructure/controller/http/{domain}/{tool}.go    # 控制器（含 Page + GuidePage）

# 前端（HTML）
frontend/templates/{domain}/{tool}.html              # 工具主页面
frontend/templates/{domain}/{tool}-guide.html        # SEO 指南页（推荐创建）

# 静态资源
frontend/static/css/{tool}.css                       # 工具样式
frontend/static/js/{tool}.js                         # 工具逻辑（或 {tool}-ui.js）
frontend/static/js/{tool}-engine.js                  # 处理引擎（Engine + UI 分离时）

# i18n（5 种语言）
common/i18n/en/{namespace}.json                      # 英文翻译
common/i18n/zh/{namespace}.json                      # 中文翻译
common/i18n/ja/{namespace}.json                      # 日文翻译
common/i18n/ko/{namespace}.json                      # 韩文翻译
common/i18n/spa/{namespace}.json                     # 西班牙文翻译
```

### 2.2 修改文件

```
# 路由注册
infrastructure/controller/http/router.go

# 首页工具卡片
frontend/templates/index.html

# 导航栏（如需要）
frontend/templates/partials/navbar.html
```

---

## 三、Go 控制器模板

### 3.1 纯前端工具控制器

```go
package {domain}

import (
	"PycMono/github/toolskit/common/faq"
	"PycMono/github/toolskit/infrastructure/controller/http/render"
	"github.com/gin-gonic/gin"
)

// {Tool}Page renders the {tool} page
func {Tool}Page(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.{tool}.title"),
		"Description": t("seo.{tool}.description"),
		"Keywords":    t("seo.{tool}.keywords"),
		"Canonical":   "https://ycjson.top{tool_route}",
		"HreflangZH":  "https://ycjson.top{tool_route}?lang=zh",
		"HreflangEN":  "https://ycjson.top{tool_route}?lang=en",
		"OGImage":     "https://ycjson.top/static/img/og.png",
		"FAQs":        faq.{Domain}FAQs(lang, "{tool}"),
		"PageClass":   "page-{tool}",
		"ToolName":    "{tool}",
	})
	render.Render(c, "{domain}/{tool}.html", data)
}

// {Tool}GuidePage renders the SEO guide page
func {Tool}GuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.{tool}.guide.title"),
		"Description": t("seo.{tool}.guide.description"),
		"Keywords":    t("seo.{tool}.guide.keywords"),
		"Canonical":   "https://ycjson.top{tool_route}-guide",
		"HreflangZH":  "https://ycjson.top{tool_route}-guide?lang=zh",
		"HreflangEN":  "https://ycjson.top{tool_route}-guide?lang=en",
		"OGImage":     "https://ycjson.top/static/img/og.png",
		"PageClass":   "page-{tool}-guide",
		"ToolName":    "{tool}-guide",
	})
	render.Render(c, "{domain}/{tool}-guide.html", data)
}
```

### 3.2 需要后端 API 的工具

```go
// {Tool}API handles the backend processing
func {Tool}API(c *gin.Context) {
	input := c.PostForm("input")
	if input == "" {
		c.JSON(400, gin.H{"error": "input required"})
		return
	}

	result, err := process{Tool}(input)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"success": true, "result": result})
}
```

---

## 四、HTML 模板骨架

### 4.1 标准工具页面

```html
{{ template "base" . }}

{{ define "extraHead" }}
<title>{{ .Title }}</title>
<meta name="description" content="{{ .Description }}">
<meta name="keywords"    content="{{ .Keywords }}">
<meta property="og:title"       content="{{ .Title }}">
<meta property="og:description" content="{{ .Description }}">
<meta property="og:type"        content="website">
<meta property="og:url"         content="https://ycjson.top{tool_route}">
<meta property="og:image"       content="https://ycjson.top/static/img/og.png">
<link rel="canonical"    href="https://ycjson.top{tool_route}">
<link rel="alternate" hreflang="zh" href="https://ycjson.top{tool_route}?lang=zh">
<link rel="alternate" hreflang="en" href="https://ycjson.top{tool_route}?lang=en">
<link rel="alternate" hreflang="ja" href="https://ycjson.top{tool_route}?lang=ja">
<link rel="alternate" hreflang="ko" href="https://ycjson.top{tool_route}?lang=ko">
<link rel="alternate" hreflang="es" href="https://ycjson.top{tool_route}?lang=spa">
<link rel="alternate" hreflang="x-default" href="https://ycjson.top{tool_route}?lang=en">
<link rel="stylesheet" href="/static/css/{tool}.css?v={{ .AssetVer }}">

<!-- JSON-LD: SoftwareApplication -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{{ .Title }}",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Any Browser",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "{{ .Description }}",
  "url": "https://ycjson.top{tool_route}"
}
</script>
{{ end }}

{{ define "content" }}
<div class="page-{tool}">

  <!-- Hero -->
  <header class="tool-hero">
    <h1 class="tool-hero__title">{{ call .T "{tool}.hero.title" }}</h1>
    <p class="tool-hero__subtitle">{{ call .T "{tool}.hero.subtitle" }}</p>
  </header>

  <!-- Tool Interface -->
  <section class="tool-workspace" data-ga="{tool}_workspace">
    <!-- 根据工具类型填充具体 UI -->
  </section>

  <!-- FAQ -->
  {{ if .FAQs }}
  <section class="tool-faq">
    <h2>{{ call .T "common.faq.title" }}</h2>
    {{ range .FAQs }}
    <details class="faq-item">
      <summary>{{ .Question }}</summary>
      <div class="faq-answer">{{ .Answer }}</div>
    </details>
    {{ end }}
  </section>
  {{ end }}

</div>

<script src="/static/js/{tool}.js?v={{ .AssetVer }}"></script>
{{ end }}
```

### 4.2 JSON 工具专用（使用 json/_base.html）

如果工具属于 JSON 工具套件，使用 `render.RenderJSONTool`：

```html
{{ template "json_base" . }}

{{ define "extraHead" }}
<title>{{ .Title }}</title>
<!-- ... meta tags ... -->
<link rel="stylesheet" href="/static/css/json-tool.css?v={{ .AssetVer }}">
{{ end }}

{{ define "content" }}
<!-- JSON tool specific content -->
{{ end }}
```

---

## 五、CSS 骨架

```css
/* {tool}.css */

/* ── Page Layout ── */
.page-{tool} {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* ── Hero ── */
.tool-hero {
  text-align: center;
  margin-bottom: 32px;
}
.tool-hero__title {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}
.tool-hero__subtitle {
  font-size: 16px;
  color: #64748b;
}

/* ── Workspace ── */
.tool-workspace {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 24px;
  margin-bottom: 32px;
}

/* ── Input ── */
.tool-input {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  resize: vertical;
}

/* ── Button ── */
.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.tool-btn:hover { background: #1d4ed8; }
.tool-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Result ── */
.tool-result {
  margin-top: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

/* ── FAQ ── */
.faq-item {
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.faq-item summary {
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 500;
  background: #f8fafc;
}
.faq-answer {
  padding: 12px 16px;
  color: #475569;
  line-height: 1.6;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .tool-hero__title { font-size: 24px; }
  .tool-workspace { padding: 16px; }
}
```

---

## 六、JavaScript 骨架

### 6.1 纯前端工具

```javascript
// {tool}.js
'use strict';

const {Tool} = (() => {
  const STATE = {
    input: '',
    isProcessing: false,
    result: null,
  };

  function init() {
    bindEvents();
  }

  function bindEvents() {
    const input = document.getElementById('toolInput');
    const btn = document.getElementById('toolBtn');
    const copyBtn = document.getElementById('copyBtn');

    if (input) {
      input.addEventListener('input', debounce(() => {
        STATE.input = input.value;
        updateUI();
      }, 250));
    }

    if (btn) {
      btn.addEventListener('click', () => {
        if (STATE.isProcessing) return;
        process();
      });
      btn.setAttribute('data-ga', '{tool}_action');
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', copyResult);
    }
  }

  function process() {
    if (STATE.isProcessing) return;
    STATE.isProcessing = true;
    updateUI();

    var _gaStart = Date.now();
    if (typeof gaTrackToolUse === 'function') gaTrackToolUse('{tool}');

    try {
      const result = compute(STATE.input);
      STATE.result = result;
      STATE.isProcessing = false;
      if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('{tool}', 1, Date.now() - _gaStart);
      updateUI();
    } catch (err) {
      STATE.isProcessing = false;
      if (typeof gaTrackError === 'function') gaTrackError('{tool}', 'process', err.message);
      showError(err.message);
      updateUI();
    }
  }

  function compute(input) {
    // 工具核心逻辑
    return input.toUpperCase(); // 示例
  }

  function updateUI() {
    const btn = document.getElementById('toolBtn');
    const result = document.getElementById('toolResult');
    if (btn) btn.disabled = STATE.isProcessing;
    if (result) result.textContent = STATE.result || '';
  }

  function showError(msg) {
    // Toast 通知参考 frontend-patterns 技能
    console.error(msg);
  }

  async function copyResult() {
    if (!STATE.result) return;
    // 剪贴板复制参考 frontend-patterns 技能的 copyToClipboard()
    await navigator.clipboard.writeText(STATE.result);
    if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('{tool}', 'text');
    Toast.show('Copied!', 'success');
  }

  // debounce 参考 frontend-patterns 技能

  return { init };
})();

document.addEventListener('DOMContentLoaded', {Tool}.init);
```

### 6.2 需要后端 API 的工具

```javascript
async function callAPI(input) {
  const res = await fetch('/api/{tool}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ input }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.result;
}
```

---

## 七、i18n 翻译骨架

在 `common/i18n/{en,zh,ja,ko,spa}/{namespace}.json` 中创建：

```json
{
  "{tool}.seo.title": "...",
  "{tool}.seo.description": "...",
  "{tool}.seo.keywords": "...",
  "{tool}.hero.title": "...",
  "{tool}.hero.subtitle": "...",
  "{tool}.input.placeholder": "...",
  "{tool}.btn.action": "...",
  "{tool}.btn.copy": "Copy",
  "{tool}.btn.download": "Download",
  "{tool}.result.empty": "Enter input to see results",
  "{tool}.error.empty_input": "Input cannot be empty",
  "{tool}.error.invalid": "Invalid input format"
}
```

---

## 八、路由注册

在 `infrastructure/controller/http/router.go` 的 `Setup()` 函数中添加：

```go
// ── {Domain} Tools ──
r.GET("{tool_route}", {domain}.{Tool}Page)
r.GET("{tool_route}-guide", {domain}.{Tool}GuidePage) // SEO 指南页（推荐）

// API
api := r.Group("/api")
{
    api.POST("/{tool}", {domain}.{Tool}API)
}
```

---

## 九、首页工具卡片

在 `frontend/templates/index.html` 的对应分类 section 中添加：

```html
<a href="{tool_route}?lang={{ .Lang }}" class="tool-card" data-ga="card_{tool}">
  <div class="tool-card__icon">{emoji}</div>
  <div class="tool-card__body">
    <h3 class="tool-card__name">{{ call .T "home.tool_{tool}" }}</h3>
    <p class="tool-card__desc">{{ call .T "home.tool_{tool}_desc" }}</p>
  </div>
  <div class="tool-card__arrow">→</div>
</a>
```

同时在 `common/i18n/{en,zh,ja,ko,spa}/common.json`（或其他适当文件）中添加：

```json
{
  "home.tool_{tool}": "{中文名称}",
  "home.tool_{tool}_desc": "{一句话描述}"
}
```

---

## 十、GA 埋点（必须执行）

### 10.1 模板埋点（data-ga）

每个新工具页面必须包含以下 `data-ga` 属性：

```html
<!-- 根容器 -->
<div class="page-{tool}" data-ga="{tool}_page">

  <!-- 主操作按钮 -->
  <button id="toolBtn" data-ga="{tool}_action">{{ call .T "{tool}.btn.action" }}</button>

  <!-- 复制按钮 -->
  <button id="copyBtn" data-ga="{tool}_copy">{{ call .T "{tool}.btn.copy" }}</button>

  <!-- 下载按钮（如有） -->
  <a id="downloadLink" download data-ga="{tool}_download">{{ call .T "{tool}.btn.download" }}</a>

  <!-- 指南页 CTA -->
  <a href="{tool_route}?lang={{ .Lang }}" class="cta-btn" data-ga="guide_cta">
    {{ call .T "common.use_tool" }}
  </a>
</div>
```

### 10.2 JS 埋点（gaTrack）

JS 骨架已在 **Step 6.1** 中内置 `gaTrackToolUse` + `gaTrackProcessDone`，无需额外修改。如果新增以下交互，补充对应埋点：

| 交互 | 埋点代码 |
|------|---------|
| 文件上传 | `gaTrackUpload('{tool}', fileCount, totalSizeMB)` |
| 设置变更（质量/格式/模式） | `gaTrackSettingChange('{tool}', 'quality', newValue)` |
| 错误提示 | `gaTrackError('{tool}', 'client_toast', errMsg)` |
| Tab 切换 | `gaTrackTabSwitch(tabName, '{tool}-tabs', '{tool}')` |
| 模态框打开 | `gaTrackModalOpen('settings', '{tool}')` |
| 表单提交 | `gaTrackFormSubmit('feedback', '{tool}')` |
| 导出（非下载） | `gaTrackExport('{tool}', 'csv')` |

### 10.3 运行 GA 审计

```bash
go run scripts/ga-audit.go .
```

确认输出：
- ❌ 没有 `error` 级别 issue
- ❌ 没有 `Undefined gaTrack functions`
- ✅ 新工具的模板和 JS 文件**不在** "has no data-ga" / "has no gaTrack" 列表中

---

## 十一、快速检查清单

创建完新工具后，逐项确认：

- [ ] Go 控制器文件已创建，使用 `render.BaseData` + `render.Render()` 模式
- [ ] HTML 模板已创建，继承 `base` 模板
- [ ] SEO 指南页已创建（`-guide.html`）并在路由注册
- [ ] CSS 文件已创建，包含移动端适配 `@media (max-width: 640px)`
- [ ] JS 文件已创建，使用 `'use strict'` 和 IIFE 或模块模式
- [ ] 路由已在 `router.go` 中注册
- [ ] i18n 翻译已添加到 5 个语言文件
- [ ] 首页工具卡片已添加
- [ ] 静态资源引用带 `?v={{ .AssetVer }}`
- [ ] SEO meta（title, description, canonical, hreflang, og:image）已配置
- [ ] JSON-LD（SoftwareApplication / HowTo）已添加
- [ ] 页面 `PageClass` 已设置
- [ ] 测试了移动端布局
- [ ] **GA 埋点**：根容器有 `data-ga="{tool}_page"`
- [ ] **GA 埋点**：主按钮有 `data-ga="{tool}_action"`
- [ ] **GA 埋点**：复制/下载按钮有 `data-ga` 属性
- [ ] **GA 埋点**：JS 主函数调用了 `gaTrackToolUse` + `gaTrackProcessDone`
- [ ] **GA 审计**：运行 `go run scripts/ga-audit.go .`，新工具无 warn/error
