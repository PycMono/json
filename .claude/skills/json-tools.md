---
name: json-tools
description: ToolboxNova JSON Toolkit 架构与开发规范。当用户提到以下任意情况时立即激活：「JSON 工具」「json toolkit」「新增 JSON 工具」「json 格式化」「json 验证」「json 转换」「代码生成」。记录 JSON 套件统一渲染架构（JsonToolPage、JsonToolMeta、_base.html）、工具选择器下拉、Monaco Editor 集成、50+ 工具的共享模式。
---

# ToolboxNova JSON Toolkit 开发规范

## 项目约束（开发前必读）

- **后端**：Go 1.25 + Gin
- **前端**：Go html/template + 原生 JavaScript + Monaco Editor
- **5 语言**：zh / en / ja / ko / spa
- **渲染**：每次请求动态解析模板（`render.RenderJSONTool`）
- **模块路径**：`PycMono/github/toolskit`

---

## 一、架构概览

JSON Toolkit 采用**元数据驱动 + 统一渲染**架构：

```
50+ JSON 工具 → 共享 json/_base.html
              → 共享 json/tool.html
              → 统一 JsonToolPage() handler
              → 元数据来自 JsonToolMeta
              → 按 Group 分类（validate / view / convert / codegen / schema / encode / generate）
```

### 核心文件

```
infrastructure/controller/http/json/json_tools.go   # JsonToolPage, JsonToolsHome
common/vo/json/meta.go                              # JsonToolMeta 定义 + AllJsonToolMetas
frontend/templates/json/_base.html                  # JSON 工具基础布局
frontend/templates/json/tool.html                   # 单个工具页面模板
frontend/templates/json/home.html                   # JSON 工具首页
frontend/static/css/json-tools.css                  # 共享样式
frontend/static/js/json-{tool}.js                   # 各工具独立 JS（纯前端处理）
```

---

## 二、Go 控制器模式

### 2.1 JsonToolMeta — 元数据驱动

```go
package json

// JsonToolMeta holds metadata for each JSON tool
type JsonToolMeta struct {
    Key      string  // 唯一标识，如 "validate", "to-typescript"
    Icon     string  // Emoji 图标
    Group    string  // 分组: validate | view | convert | codegen | schema | encode | generate
    TitleZH  string  // 中文标题
    TitleEN  string  // 英文标题
    DescZH   string  // 中文描述
    DescEN   string  // 英文描述
    Keywords string  // SEO 关键词
}
```

所有工具元数据注册在 `AllJsonToolMetas` 切片中：

```go
var AllJsonToolMetas = []JsonToolMeta{
    {Key: "validate", Icon: "✅", Group: "validate", TitleZH: "JSON 验证器", TitleEN: "JSON Validator", ...},
    {Key: "pretty", Icon: "🎨", Group: "validate", TitleZH: "JSON 美化格式化", TitleEN: "JSON Pretty Print", ...},
    {Key: "tree", Icon: "🌳", Group: "view", TitleZH: "JSON 树形查看器", TitleEN: "JSON Tree Viewer", ...},
    {Key: "to-csv", Icon: "📋", Group: "convert", TitleZH: "JSON 转 CSV", TitleEN: "JSON to CSV", ...},
    {Key: "to-typescript", Icon: "🔷", Group: "codegen", TitleZH: "JSON 转 TypeScript", TitleEN: "JSON to TypeScript", ...},
    // ... 50+ tools
}
```

### 2.2 JsonToolPage — 统一 Handler

```go
// JsonToolPage returns a gin.HandlerFunc for a specific JSON tool
func JsonToolPage(toolKey string) gin.HandlerFunc {
    return func(c *gin.Context) {
        lang := c.GetString("lang")
        if lang == "" { lang = "zh" }
        t := render.GetT(c)
        meta := getJsonToolMeta(toolKey)

        title := meta.TitleZH
        desc := meta.DescZH
        if lang == "en" {
            title = meta.TitleEN
            desc = meta.DescEN
        }
        siteTitle := title + " — " + map[string]string{
            "zh": "免费在线 JSON 工具 | ToolsKit",
            "en": "Free Online JSON Tool | ToolsKit",
        }[lang]

        canonical := "https://ycjson.top/json/" + toolKey
        hreflangZH := canonical + "?lang=zh"
        hreflangEN := canonical + "?lang=en"

        // SEO article from i18n (switch-case per tool)
        var seoArticle string
        switch toolKey {
        case "validate":
            seoArticle = t("json.validate.seo.article")
        case "pretty":
            seoArticle = t("json.pretty.seo.article")
        // ... one case per tool
        }

        data := render.BaseData(c, gin.H{
            "Title":        siteTitle,
            "Description":  desc,
            "Keywords":     meta.Keywords,
            "Canonical":    canonical,
            "HreflangZH":   hreflangZH,
            "HreflangEN":   hreflangEN,
            "Lang":         lang,
            "T":            t,
            "ToolKey":      toolKey,
            "Meta":         meta,
            "HotTools":     getHotTools(),
            "RelatedTools": getRelatedTools(toolKey),
            "AllTools":     json2.AllJsonToolMetas,
            "PageClass":    "page-json-tool",
            "OutputIsJSON": jsonOutputTools[toolKey],
            "SEOArticle":   template.HTML(seoArticle),
        })
        render.RenderJSONTool(c, "tool.html", data)
    }
}
```

### 2.3 路由注册

```go
jt := r.Group("/json")
{
    jt.GET("", json.JsonToolsHome)
    jt.GET("/validate", json.JsonToolPage("validate"))
    jt.GET("/pretty", json.JsonToolPage("pretty"))
    jt.GET("/to-typescript", json.JsonToolPage("to-typescript"))
    // ... one line per tool
}
```

### 2.4 后端 API（需要时）

少数工具需要后端 API，直接在 `json_tools.go` 中添加：

```go
func TokenCountAPI(c *gin.Context) {
    var req struct { Text string `json:"text"`; Model string `json:"model"` }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    // ... processing
    c.JSON(200, gin.H{"count": tokens, "model": model})
}
```

路由注册：
```go
jt.POST("/api/token-count", json.TokenCountAPI)
```

---

## 三、HTML 模板架构

### 3.1 _base.html — JSON 工具基础布局

`frontend/templates/json/_base.html` 是一个独立的基础布局（不继承 `base.html`）：

```html
{{ define "json_base" }}<!DOCTYPE html>
<html lang="{{ .Lang }}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>(function(){var t=localStorage.getItem('tbn-theme')||'light';document.documentElement.setAttribute('data-theme',t);})()</script>
  {{- template "partials/ga.html" . }}
  <title>{{ .Title }}</title>
  <meta name="description" content="{{ .Description }}">
  {{ if .Keywords }}<meta name="keywords" content="{{ .Keywords }}">{{ end }}
  <link rel="stylesheet" href="/static/css/main.css?v={{ .AssetVer }}">
  <link rel="stylesheet" href="/static/css/json-tools.css?{{ .AssetVer }}">

  {{ if .Canonical }}<link rel="canonical" href="{{ .Canonical }}">{{ end }}
  {{ if .HreflangZH }}<link rel="alternate" hreflang="zh" href="{{ .HreflangZH }}">{{ end }}
  {{ if .HreflangEN }}<link rel="alternate" hreflang="en" href="{{ .HreflangEN }}">{{ end }}

  {{ block "json_head" . }}{{ end }}
</head>
<body class="jt-page {{ .PageClass }}">
{{ template "navbar" . }}
<main class="main-content">
{{ block "json_content" . }}{{ end }}
</main>
<!-- Footer -->
</body></html>{{ end }}
```

### 3.2 tool.html — 单个工具页面

```html
{{ define "json_head" }}
<!-- Monaco Editor -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
{{ end }}

{{ define "json_content" }}
{{ $lang := .Lang }}
{{ $meta := .Meta }}

<!-- Sub-Navigation (Hot Tools) -->
<nav class="jt-subnav">
  <a href="/json?lang={{ $lang }}" class="jt-subnav__logo">{{ call .T "json.back_to_toolbox" }}</a>
  <div class="jt-subnav__scroll">
    {{ range .HotTools }}
    <a href="/json/{{ .Key }}?lang={{ $lang }}" class="jt-subnav__tab{{ if eq $.ToolKey .Key }} active{{ end }}">
      <span>{{ .Icon }}</span>
      <span>{{ if eq $lang "zh" }}{{ .TitleZH }}{{ else }}{{ .TitleEN }}{{ end }}</span>
    </a>
    {{ end }}
  </div>
</nav>

<!-- Tool Hero -->
<section class="jt-tool-hero">
  <span class="jt-tool-hero__icon">{{ $meta.Icon }}</span>
  <h1 class="jt-tool-hero__title">{{ if eq $lang "zh" }}{{ $meta.TitleZH }}{{ else }}{{ $meta.TitleEN }}{{ end }}</h1>
  <p class="jt-tool-hero__desc">{{ if eq $lang "zh" }}{{ $meta.DescZH }}{{ else }}{{ $meta.DescEN }}{{ end }}</p>
</section>

<!-- Tool Selector Dropdown -->
<div class="jt-tool-selector-bar">
  <div class="jt-tool-selector" onclick="toggleToolSelector()">
    <span class="jt-tool-selector__icon">{{ $meta.Icon }}</span>
    <span class="jt-tool-selector__name">{{ if eq $lang "zh" }}{{ $meta.TitleZH }}{{ else }}{{ $meta.TitleEN }}{{ end }}</span>
    <span class="jt-tool-selector__arrow">▾</span>
    <div class="jt-tool-dropdown" onclick="event.stopPropagation()">
      <input type="text" id="toolSearchInput" placeholder="Search tools..." oninput="filterToolDropdown(this.value)">
      {{ range $group := list "validate" "view" "convert" "codegen" "schema" "encode" "generate" }}
      <div class="jt-tool-dropdown__group" data-group="{{ $group }}">
        <div class="jt-tool-dropdown__group-title">{{ call $.T (printf "json.home.group.%s" $group) }}</div>
        {{ range $.AllTools }}{{ if eq .Group $group }}
        <div class="jt-tool-dropdown__item{{ if eq $.ToolKey .Key }} active{{ end }}" data-key="{{ .Key }}" onclick="selectTool('{{ .Key }}')">
          <span>{{ .Icon }}</span> {{ if eq $lang "zh" }}{{ .TitleZH }}{{ else }}{{ .TitleEN }}{{ end }}
        </div>
        {{ end }}{{ end }}
      </div>
      {{ end }}
    </div>
  </div>
</div>

<!-- Per-Tool Options Bar -->
<div class="jt-tool-options-bar" id="toolOptionsBar">
  <div id="toolOptions"></div>
</div>

<!-- Main Workspace -->
<section class="jt-tool-workspace">
  <div class="jt-editor-panel">
    <div class="jt-panel-header">
      <span class="jt-panel-label">{{ call .T "json.input.label" }}</span>
      <div class="jt-panel-actions">
        <button onclick="clearInput()">{{ call .T "common.clear" }}</button>
        <button onclick="pasteInput()">{{ call .T "common.paste" }}</button>
        <button onclick="loadSample()">{{ call .T "json.sample" }}</button>
      </div>
    </div>
    <div id="inputEditor" class="jt-monaco-editor"></div>
  </div>

  <div class="jt-editor-panel">
    <div class="jt-panel-header">
      <span class="jt-panel-label">{{ call .T "json.output.label" }}</span>
      <div class="jt-panel-actions">
        <button onclick="copyOutput()">{{ call .T "common.copy" }}</button>
        <button onclick="downloadOutput()">{{ call .T "common.download" }}</button>
      </div>
    </div>
    <div id="outputEditor" class="jt-monaco-editor"></div>
  </div>
</section>

<!-- SEO Article -->
{{ if .SEOArticle }}
<article class="jt-seo-article">{{ .SEOArticle }}</article>
{{ end }}

<script src="/static/js/json-{{ .ToolKey }}.js?v={{ .AssetVer }}"></script>
{{ end }}
```

---

## 四、JavaScript 架构

### 4.1 工具初始化模式

每个 JSON 工具有独立的 JS 文件：

```javascript
// json-validate.js
(function() {
  'use strict';

  const TOOL_KEY = 'validate';
  let inputEditor, outputEditor;

  function init() {
    initMonacoEditors();
    bindEvents();
    loadSampleData();
  }

  function initMonacoEditors() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
      inputEditor = monaco.editor.create(document.getElementById('inputEditor'), {
        value: '',
        language: 'json',
        theme: 'vs',
        minimap: { enabled: false },
        automaticLayout: true,
      });
      outputEditor = monaco.editor.create(document.getElementById('outputEditor'), {
        value: '',
        language: 'json',
        theme: 'vs',
        readOnly: true,
        minimap: { enabled: false },
        automaticLayout: true,
      });
    });
  }

  function process() {
    const text = inputEditor.getValue();
    if (!text.trim()) return;
    try {
      const result = transform(text);
      outputEditor.setValue(result);
    } catch (err) {
      outputEditor.setValue('Error: ' + err.message);
    }
  }

  function transform(text) {
    // Tool-specific logic
    const obj = JSON.parse(text);
    return JSON.stringify(obj, null, 2);
  }

  function bindEvents() {
    document.getElementById('processBtn').addEventListener('click', process);
    // ...
  }

  document.addEventListener('DOMContentLoaded', init);
})();
```

### 4.2 Monaco Editor 配置

```javascript
const MONACO_CONFIG = {
  baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs',
  options: {
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on',
    renderWhitespace: 'selection',
  }
};
```

### 4.3 工具选择器切换

```javascript
function toggleToolSelector() {
  document.getElementById('toolDropdown').classList.toggle('active');
}

function filterToolDropdown(query) {
  const items = document.querySelectorAll('.jt-tool-dropdown__item');
  items.forEach(item => {
    const name = item.dataset.name.toLowerCase();
    const keywords = (item.dataset.keywords || '').toLowerCase();
    item.style.display = (name.includes(query) || keywords.includes(query)) ? '' : 'none';
  });
}

function selectTool(key) {
  window.location.href = '/json/' + key + '?lang=' + document.documentElement.lang;
}
```

### 4.4 Copy / Download

```javascript
function copyOutput() {
  const text = outputEditor.getValue();
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}

function downloadOutput() {
  const text = outputEditor.getValue();
  const blob = new Blob([text], { type: 'application/json' });
  saveAs(blob, 'output.json');
}
```

---

## 五、CSS 架构

JSON 工具使用 `frontend/static/css/json-tools.css`：

```css
/* json-tools.css */

/* ── Page ── */
.jt-page {
  background: var(--bg);
  min-height: 100vh;
}

/* ── Subnav ── */
.jt-subnav {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 8px 16px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.jt-subnav__tab {
  padding: 6px 12px;
  border-radius: 6px;
  white-space: nowrap;
  font-size: 13px;
}
.jt-subnav__tab.active {
  background: var(--primary);
  color: white;
}

/* ── Tool Selector ── */
.jt-tool-selector-bar {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}
.jt-tool-selector {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}
.jt-tool-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  display: none;
  z-index: 100;
}
.jt-tool-dropdown.active { display: block; }

/* ── Workspace ── */
.jt-tool-workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
}
.jt-editor-panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.jt-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
}
.jt-monaco-editor {
  height: 400px;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .jt-tool-workspace {
    grid-template-columns: 1fr;
  }
}
```

---

## 六、新增 JSON 工具流程

### 6.1 纯前端工具（绝大多数）

1. **添加元数据** — 在 `common/vo/json/meta.go` 的 `AllJsonToolMetas` 中添加：
   ```go
   {Key: "new-tool", Icon: "🆕", Group: "validate", TitleZH: "...", TitleEN: "...", DescZH: "...", DescEN: "...", Keywords: "..."}
   ```

2. **添加 SEO 文章** — 在 `json_tools.go` 的 switch-case 中添加：
   ```go
   case "new-tool":
       seoArticle = t("json.new-tool.seo.article")
   ```

3. **添加路由** — 在 `router.go` 中添加：
   ```go
   jt.GET("/new-tool", json.JsonToolPage("new-tool"))
   ```

4. **创建 JS 文件** — `frontend/static/js/json-new-tool.js`：
   ```javascript
   (function() {
     'use strict';
     // Tool-specific logic using Monaco Editor
   })();
   ```

5. **添加 i18n** — 在 `common/i18n/{en,zh,ja,ko,spa}/json.json` 中添加翻译键

6. **添加到首页** — 在 `frontend/templates/index.html` 的对应分类中添加工具卡片

### 6.2 需要后端 API 的工具

1. 完成上述所有纯前端步骤
2. 在 `json_tools.go` 中添加 API handler
3. 在 `router.go` 的 `/api` group 中添加路由：
   ```go
   jt.POST("/api/new-tool", json.NewToolAPI)
   ```

---

## 七、新增 JSON 工具检查清单

- [ ] 在 `common/vo/json/meta.go` 的 `AllJsonToolMetas` 中添加元数据
- [ ] 在 `json_tools.go` 的 switch-case 中添加 SEO 文章映射
- [ ] 在 `router.go` 中注册页面路由
- [ ] 创建 `frontend/static/js/json-{tool}.js`
- [ ] 在 5 个语言文件中添加 `json.{tool}.*` 翻译键
- [ ] 如果是后端工具，添加 API handler 和 API 路由
- [ ] 在 `index.html` 中添加工具卡片
- [ ] 验证 `go build ./...` 通过
