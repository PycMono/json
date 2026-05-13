---
name: pdf-tools
description: ToolboxNova PDF Tools Suite 架构与开发规范。当用户提到以下任意情况时立即激活：「PDF 工具」「pdf 合并」「pdf 拆分」「pdf 压缩」「pdf 加密」「pdf-lib」「新增 PDF 工具」。记录 PDF 套件统一渲染架构（pdfBase、RenderPDFTool、_tabs.html）、pdf-lib CDN 集成、每个工具的独立模板模式。
---

# ToolboxNova PDF Tools Suite 开发规范

## 项目约束（开发前必读）

- **后端**：Go 1.25 + Gin
- **前端**：Go html/template + 原生 JavaScript + pdf-lib.js
- **5 语言**：zh / en / ja / ko / spa
- **渲染**：每次请求动态解析模板（`render.RenderPDFTool`）
- **模块路径**：`PycMono/github/toolskit`

---

## 一、架构概览

PDF Toolkit 采用**统一基础数据 + 独立模板**架构：

```
8 PDF 工具 → 共享 pdfBase() 数据生成
           → 共享 render.RenderPDFTool()
           → 共享 pdf/_tabs.html 导航
           → 共享 pdf-tools.css 样式
           → 每个工具有独立 HTML 模板
           → 每个工具有独立 JS 文件
           → 纯前端处理（pdf-lib.js）
```

### 工具列表

```
/pdf/reorder      → ReorderPage      (页面重排)
/pdf/extract-text → ExtractTextPage  (文本提取)
/pdf/merge        → MergePage        (合并)
/pdf/split        → SplitPage        (拆分)
/pdf/to-image     → ToImagePage      (转图片)
/pdf/watermark    → WatermarkPage    (水印)
/pdf/encrypt      → EncryptPage      (加密)
/pdf/compress     → CompressPage     (压缩)
```

---

## 二、Go 控制器模式

### 2.1 pdfBase — 统一基础数据

```go
package pdf

// pdfBase returns common base data for every PDF tool page
func pdfBase(c *gin.Context, tool string, extra gin.H) gin.H {
    t := render.GetT(c)
    lang := render.GetLang(c)
    faqs := faq.PDFFAQs(lang, tool)
    data := render.BaseData(c, gin.H{
        "PDFTool":     tool,
        "PageClass":   "page-pdf-tool page-pdf-" + tool,
        "Title":       t("seo.pdf." + tool + ".title"),
        "Description": t("seo.pdf." + tool + ".description"),
        "Keywords":    t("seo.pdf." + tool + ".keywords"),
        "FAQs":        faqs,
    })
    for k, v := range extra {
        data[k] = v
    }
    return data
}
```

### 2.2 每个工具的控制器

```go
func MergePage(c *gin.Context) {
    render.RenderPDFTool(c, "pdf/merge.html", pdfBase(c, "merge", nil))
}

func SplitPage(c *gin.Context) {
    render.RenderPDFTool(c, "pdf/split.html", pdfBase(c, "split", nil))
}
```

### 2.3 RenderPDFTool

```go
func RenderPDFTool(c *gin.Context, page string, data gin.H) {
    templateFiles := []string{
        filepath.Join("frontend/templates", "base.html"),
        filepath.Join("frontend/templates", page),
        filepath.Join("frontend/templates", "pdf", "_tabs.html"),
        filepath.Join("frontend/templates", "partials", "navbar.html"),
        filepath.Join("frontend/templates", "partials", "ad_slot.html"),
        filepath.Join("frontend/templates", "partials", "ga.html"),
        filepath.Join("frontend/templates", "partials", "cookie-consent.html"),
        filepath.Join("frontend/templates", "partials", "tool_tabs_nav.html"),
    }
    // ... parse and execute
}
```

### 2.4 SEO 数据

PDF 工具的 SEO 数据从 i18n 获取：

```
t("seo.pdf.merge.title")
t("seo.pdf.merge.description")
t("seo.pdf.merge.keywords")
```

翻译文件：`common/i18n/{lang}/pdf.json`

### 2.5 FAQ 数据

```go
faqs := faq.PDFFAQs(lang, tool)
```

每个 PDF 工具有独立的 FAQ 集合。

---

## 三、HTML 模板架构

### 3.1 _tabs.html — 共享导航

`frontend/templates/pdf/_tabs.html`:

```html
{{ define "pdf_tabs" }}
<div class="pdf-tabs-wrap">
  <nav class="pdf-tabs" role="tablist">
    <a href="/pdf/reorder?lang={{ .Lang }}"      class="pdf-tab {{ if eq .PDFTool "reorder"      }}pdf-tab--active{{ end }}">📋 <span>{{ call .T "pdf.tab.reorder" }}</span></a>
    <a href="/pdf/extract-text?lang={{ .Lang }}" class="pdf-tab {{ if eq .PDFTool "extract-text" }}pdf-tab--active{{ end }}">📝 <span>{{ call .T "pdf.tab.extract" }}</span></a>
    <a href="/pdf/merge?lang={{ .Lang }}"        class="pdf-tab {{ if eq .PDFTool "merge"        }}pdf-tab--active{{ end }}">🔀 <span>{{ call .T "pdf.tab.merge" }}</span></a>
    <a href="/pdf/split?lang={{ .Lang }}"        class="pdf-tab {{ if eq .PDFTool "split"        }}pdf-tab--active{{ end }}">✂️ <span>{{ call .T "pdf.tab.split" }}</span></a>
    <a href="/pdf/to-image?lang={{ .Lang }}"     class="pdf-tab {{ if eq .PDFTool "to-image"     }}pdf-tab--active{{ end }}">🖼️ <span>{{ call .T "pdf.tab.to_image" }}</span></a>
    <a href="/pdf/watermark?lang={{ .Lang }}"    class="pdf-tab {{ if eq .PDFTool "watermark"    }}pdf-tab--active{{ end }}">💧 <span>{{ call .T "pdf.tab.watermark" }}</span></a>
    <a href="/pdf/encrypt?lang={{ .Lang }}"      class="pdf-tab {{ if eq .PDFTool "encrypt"      }}pdf-tab--active{{ end }}">🔒 <span>{{ call .T "pdf.tab.encrypt" }}</span></a>
    <a href="/pdf/compress?lang={{ .Lang }}"     class="pdf-tab {{ if eq .PDFTool "compress"     }}pdf-tab--active{{ end }}">📦 <span>{{ call .T "pdf.tab.compress" }}</span></a>
  </nav>
</div>
{{ end }}
```

### 3.2 单个工具模板

每个 PDF 工具有独立的 HTML 模板：

```html
{{ template "base" . }}

{{ define "extraHead" }}
<link rel="stylesheet" href="/static/css/pdf-tools.css?v={{ .AssetVer }}">
<script src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{{- range $i,$f := .FAQs }}{{if $i}},{{end}}{"@type":"Question","name":{{ $f.Q | html }},"acceptedAnswer":{"@type":"Answer","text":{{ $f.A | html }}}}{{- end}}]}
</script>
{{ end }}

{{ define "content" }}
{{ template "pdf_tabs" . }}

<div class="pdf-tool-page">
  <!-- Hero -->
  <header class="pdf-hero">
    <h1 class="pdf-hero__title">{{ call .T "pdf.merge.header.title" }}</h1>
    <p class="pdf-hero__sub">{{ call .T "pdf.merge.header.sub" }}</p>
  </header>

  <!-- Upload Zone -->
  <div class="pdf-upload-zone" id="mergeUploadZone">
    <div class="pdf-upload-idle">
      <div class="pdf-upload-idle__icon">📄</div>
      <p class="pdf-upload-idle__title">{{ call .T "pdf.merge.upload.title" }}</p>
      <input type="file" id="mergeFileInput" accept=".pdf,application/pdf" multiple style="display:none">
    </div>
  </div>

  <!-- File List / Settings -->
  <div id="mergeList" style="display:none">
    <!-- ... -->
  </div>
</div>

<script src="/static/js/pdf-merge.js?v={{ .AssetVer }}"></script>
{{ end }}
```

---

## 四、JavaScript 架构

### 4.1 pdf-lib.js 基础用法

```javascript
const { PDFDocument, PDFPage, StandardFonts, rgb, degrees } = PDFLib;

// 从文件加载
async function loadPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  return await PDFDocument.load(arrayBuffer);
}

// 创建新 PDF
async function createPDF() {
  return await PDFDocument.create();
}

// 保存并下载
async function downloadPDF(pdfDoc, filename) {
  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 4.2 Merge 示例

```javascript
async function mergePDFs(files) {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const pdf = await loadPDF(file);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }
  return mergedPdf;
}
```

### 4.3 Split 示例

```javascript
async function splitPDF(file, pageRanges) {
  const pdf = await loadPDF(file);
  const results = [];
  for (const range of pageRanges) {
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdf, range);
    pages.forEach(p => newPdf.addPage(p));
    results.push(newPdf);
  }
  return results;
}
```

### 4.4 Extract Text 示例

```javascript
async function extractText(file) {
  const pdf = await loadPDF(file);
  const pages = pdf.getPages();
  const texts = [];
  for (let i = 0; i < pages.length; i++) {
    const text = await pages[i].getTextContent();
    texts.push(text.items.map(item => item.str).join(' '));
  }
  return texts;
}
```

### 4.5 Add Watermark 示例

```javascript
async function addWatermark(file, text) {
  const pdf = await loadPDF(file);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  pages.forEach(page => {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - 100,
      y: height / 2,
      size: 50,
      font,
      color: rgb(0.5, 0.5, 0.5),
      rotate: degrees(-45),
      opacity: 0.3,
    });
  });
  return pdf;
}
```

### 4.6 Encrypt 示例

```javascript
async function encryptPDF(file, password) {
  const pdf = await loadPDF(file);
  const bytes = await pdf.save({
    userPassword: password,
    ownerPassword: password,
    permissions: { printing: 'highResolution', modifying: false }
  });
  return bytes;
}
```

---

## 五、CSS 架构

PDF 工具使用 `frontend/static/css/pdf-tools.css`：

```css
/* pdf-tools.css */

/* ── Tabs ── */
.pdf-tabs-wrap {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}
.pdf-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
}
.pdf-tab {
  padding: 8px 16px;
  border-radius: 6px;
  white-space: nowrap;
  font-size: 14px;
  color: var(--text-secondary);
}
.pdf-tab--active {
  background: var(--primary);
  color: white;
}

/* ── Hero ── */
.pdf-hero {
  text-align: center;
  padding: 40px 16px;
}
.pdf-hero__title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

/* ── Upload Zone ── */
.pdf-upload-zone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}
.pdf-upload-zone:hover {
  border-color: var(--primary);
}
.pdf-upload-idle__icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* ── File List ── */
.pdf-thumb-grid-wrap {
  margin-top: 24px;
}
.pdf-thumb-grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* ── Settings ── */
.pdf-settings {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
}
.pdf-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.pdf-label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}
.pdf-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
}

/* ── Buttons ── */
.pdf-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}
.pdf-btn--primary {
  background: var(--primary);
  color: white;
}
.pdf-btn--danger {
  background: var(--error);
  color: white;
}
.pdf-action-btn {
  width: 100%;
  padding: 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 16px;
  cursor: pointer;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .pdf-hero__title { font-size: 22px; }
  .pdf-tabs { padding: 8px; }
  .pdf-tab { padding: 6px 10px; font-size: 12px; }
}
```

---

## 六、新增 PDF 工具流程

1. **创建控制器** — 在 `infrastructure/controller/http/pdf/` 中添加：
   ```go
   func NewToolPage(c *gin.Context) {
       render.RenderPDFTool(c, "pdf/new_tool.html", pdfBase(c, "new-tool", nil))
   }
   ```

2. **创建模板** — `frontend/templates/pdf/new_tool.html`：
   ```html
   {{ template "base" . }}
   {{ define "extraHead" }}
   <link rel="stylesheet" href="/static/css/pdf-tools.css?v={{ .AssetVer }}">
   <script src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
   {{ end }}
   {{ define "content" }}
   {{ template "pdf_tabs" . }}
   <div class="pdf-tool-page">
     <!-- tool-specific content -->
   </div>
   <script src="/static/js/pdf-new-tool.js?v={{ .AssetVer }}"></script>
   {{ end }}
   ```

3. **创建 JS** — `frontend/static/js/pdf-new-tool.js`

4. **添加 i18n** — 在 `common/i18n/{lang}/pdf.json` 中添加：
   ```json
   {
     "seo.pdf.new-tool.title": "...",
     "seo.pdf.new-tool.description": "...",
     "seo.pdf.new-tool.keywords": "...",
     "pdf.tab.new_tool": "...",
     "pdf.new-tool.header.title": "..."
   }
   ```

5. **添加路由** — 在 `router.go` 中添加：
   ```go
   pdfGroup.GET("/new-tool", pdfController.NewToolPage)
   ```

6. **添加 tabs** — 在 `frontend/templates/pdf/_tabs.html` 中添加导航链接

7. **添加 FAQ** — 在 `common/faq/` 中添加 PDF FAQ 数据（如需要）

---

## 七、新增 PDF 工具检查清单

- [ ] 在 `pdf_tools.go` 中添加控制器函数
- [ ] 创建 `frontend/templates/pdf/{tool}.html`
- [ ] 创建 `frontend/static/js/pdf-{tool}.js`
- [ ] 在 `frontend/templates/pdf/_tabs.html` 中添加导航链接
- [ ] 在 `common/i18n/{en,zh,ja,ko,spa}/pdf.json` 中添加 SEO 和 UI 翻译
- [ ] 在 `router.go` 中注册路由
- [ ] 在 `index.html` 中添加工具卡片（如果是全新工具）
- [ ] 验证 `go build ./...` 通过
- [ ] 测试 pdf-lib.js 处理逻辑
