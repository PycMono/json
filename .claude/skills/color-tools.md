---
name: color-tools
description: ToolboxNova Color Tools Suite 架构与开发规范。当用户提到以下任意情况时立即激活：「颜色工具」「color tool」「拾色器」「调色板」「色轮」「颜色转换」「对比度」「渐变生成」「图片取色」「色盲模拟」「Tailwind 颜色」。记录 Color 套件共享模板、colorPageData 控制器模式、色彩空间转换、chroma.js/colorjs.io CDN 依赖、Dark Mode 和子导航架构。
---

# ToolboxNova Color Tools Suite 开发规范

## 项目约束（开发前必读）

- **后端**：Go 1.25 + Gin
- **前端**：Go html/template + 原生 JavaScript + 共享 CSS
- **5 语言**：zh / en / ja / ko / spa
- **渲染**：每次请求动态解析模板
- **模块路径**：`PycMono/github/toolskit`

---

## 一、架构概览

Color 工具套件采用**单页共享模板**架构：

```
所有 Color 工具 → 共享 color/tools.html
                → 共享 color-tools.css
                → 共享 color-tools.js
                → 通过 data-tool 属性切换
```

### 路由映射

```
/color/tools     → ColorToolsHub  (hub page)
/color/picker    → ColorPickerPage
/color/palette   → ColorPalettePage
/color/wheel     → ColorWheelPage
/color/converter → ColorConverterV2Page
/color/contrast  → ColorContrastPage
/color/gradient  → ColorGradientPage
/color/image-picker → ColorImagePickerPage
/color/blindness → ColorBlindnessPage
/color/names     → ColorNamesPage
/color/mixer     → ColorMixerPage
/color/tailwind  → ColorTailwindPage
```

---

## 二、Go 控制器模式

### 2.1 colorSEO — 内联 SEO 数据

所有 Color 工具的 SEO 元数据内联定义在 `color.go` 的 `colorSEO()` 函数中：

```go
func colorSEO(tool, lang string) map[string]string {
    type entry struct{ en, zh string }
    data := map[string]map[string]entry{
        "picker": {
            "title":       {"Free Color Picker...", "免费拾色器..."},
            "description": {"Pick any color...", "拾取任何颜色..."},
            "keywords":    {"color picker...", "拾色器..."},
            "ogTitle":     {"Advanced Color Picker...", "高级拾色器..."},
            "ogDesc":      {"Get color values...", "即时获取..."},
            "canonical":   {"https://ycjson.top/color/picker", "https://ycjson.top/color/picker?lang=zh"},
        },
        // ... other tools
    }
    // ... pick logic based on lang
}
```

### 2.2 colorPageData — 统一页面数据

```go
func colorPageData(c *gin.Context, tool string) gin.H {
    lang := c.GetString("lang")
    if lang == "" { lang = "en" }
    t := render.GetT(c)
    seo := colorSEO(tool, lang)
    faqData := faq.ColorFAQs(lang)

    return render.BaseData(c, gin.H{
        "Title":        seo["title"],
        "Description":  seo["description"],
        "Keywords":     seo["keywords"],
        "Lang":         lang,
        "T":            t,
        "SEO":          seo,
        "FAQ":          faqData,
        "ToolName":     "color-" + tool,
        "ActiveTool":   tool,
        "CanonicalURL": seo["canonical"],
        "HreflangEN":   "https://ycjson.top/color/" + tool + "?lang=en",
        "HreflangZH":   "https://ycjson.top/color/" + tool + "?lang=zh",
        "PageClass":    "page-color-" + tool,
    })
}
```

### 2.3 每个工具的控制器

```go
func ColorPickerPage(c *gin.Context) {
    render.Render(c, "color/tools.html", colorPageData(c, "picker"))
}
```

---

## 三、HTML 共享模板

### 3.1 模板结构

`frontend/templates/color/tools.html`:

```html
{{ template "base" . }}

{{ define "extraHead" }}
<meta property="og:title" content="{{ index .SEO "ogTitle" }}">
<meta property="og:description" content="{{ index .SEO "ogDesc" }}">
<meta property="og:image" content="https://ycjson.top/static/img/og-color-tools.png">
<link rel="alternate" hreflang="en" href="{{ .HreflangEN }}">
<link rel="alternate" hreflang="zh" href="{{ .HreflangZH }}">
<link rel="alternate" hreflang="x-default" href="{{ index .SEO "canonical" }}">

<!-- JSON-LD: SoftwareApplication + FAQPage -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{{ if eq .Lang "zh" }}ToolsKit 颜色工具{{ else }}ToolsKit Color Tools{{ end }}",
  "applicationCategory": "DesignApplication",
  "operatingSystem": "Any (Web Browser)",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
</script>

<link rel="stylesheet" href="/static/css/color-tools.css?v={{ .AssetVer }}">
<!-- CDN dependencies -->
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/chroma-js/2.6.0/chroma.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/colorjs.io@0.5.2/dist/color.global.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.3/Sortable.min.js"></script>
{{ end }}

{{ define "content" }}
<div class="ct-page" data-tool="{{ .ActiveTool }}" data-lang="{{ .Lang }}">

  <!-- Sub-navigation -->
  <nav class="ct-subnav">
    <a href="/color/picker?lang={{ .Lang }}" class="ct-subnav__item{{ if eq .ActiveTool "picker" }} ct-subnav__item--active{{ end }}">
      💧 {{ call .T "color.nav.picker" }}
    </a>
    <!-- ... other nav items ... -->
  </nav>

  <!-- Tool-specific sections -->
  {{ if eq .ActiveTool "picker" }}
    <!-- picker HTML -->
  {{ end }}

  {{ if eq .ActiveTool "palette" }}
    <!-- palette HTML -->
  {{ end }}

  <!-- FAQ -->
  {{ if .FAQ }}
  <section class="ct-faq">
    <h2>{{ call .T "common.faq.title" }}</h2>
    {{ range .FAQ }}
    <details class="faq-item">
      <summary>{{ .Q }}</summary>
      <div class="faq-answer">{{ .A }}</div>
    </details>
    {{ end }}
  </section>
  {{ end }}

</div>
<script src="/static/js/color-tools.js?v={{ .AssetVer }}">
{{ end }}
```

### 3.2 新增工具步骤

1. 在 `color/tools.html` 中添加 `{{ if eq .ActiveTool "new-tool" }}` 区块
2. 在 `.ct-subnav` 中添加导航链接
3. 在 `color.go` 的 `colorSEO()` 中添加 SEO 数据
4. 在 `color-tools.js` 中添加 `ctInitNewTool()` 函数
5. 在 `color-tools.css` 中添加工具样式（以 `.ct-new-tool` 为前缀）
6. 在 `router.go` 中注册路由

---

## 四、JavaScript 架构

### 4.1 全局 State

```javascript
var State = {
  picker: { currentColor: '#6366f1', hue: 248, sat: 0.65, val: 0.95 },
  palette: { colors: [], harmony: 'random', count: 5, history: [], historyIndex: -1 },
  contrast: { fg: '#000000', bg: '#ffffff' },
  gradient: { stops: [...], type: 'linear', angle: 90, colorSpace: 'oklch' },
  imagePicker: { imageLoaded: false, imageData: null, dominantColors: [] },
  ui: { darkMode: false, exportFormat: 'css' },
  objectURLs: []
};
```

### 4.2 工具初始化模式

```javascript
document.addEventListener('DOMContentLoaded', function () {
  var _tool = document.querySelector('.ct-page').dataset.tool;

  if (_tool === 'picker')       ctInitPicker();
  if (_tool === 'palette')      ctInitPalette();
  if (_tool === 'wheel')        ctInitWheel();
  if (_tool === 'converter')    ctInitConverter();
  if (_tool === 'contrast')     ctInitContrast();
  if (_tool === 'gradient')     ctInitGradient();
  if (_tool === 'image-picker') ctInitImagePicker();
  if (_tool === 'blindness')    ctInitBlindness();
  if (_tool === 'names')        ctInitNames();
  if (_tool === 'mixer')        ctInitMixer();
  if (_tool === 'tailwind')     ctInitTailwind();

  ctInitFaqAccordion();
  ctInitKeyboard();
  ctRestoreFromHash();
});
```

### 4.3 色彩空间转换

#### chroma.js (基本空间)

```javascript
const color = chroma('#6366f1');

// 获取各格式
const hex   = color.hex();
const rgb   = color.rgb();      // [99, 102, 241]
const hsl   = color.hsl();      // [h, s, l] (h: 0-360, s/l: 0-1)
const hsv   = color.hsv();      // [h, s, v] (h: 0-360, s/v: 0-1)
const cmyk  = color.cmyk();     // [c, m, y, k] (0-1)
const lab   = color.lab();      // [L, a, b]
const lch   = color.lch();      // [L, C, H]

// 从各格式创建
chroma.rgb(99, 102, 241);
chroma.hsl(248, 0.65, 0.95);
```

#### colorjs.io (高级空间: OKLCH, HWB, XYZ)

```javascript
const c = new Color('#6366f1');

// 转换到各空间
const oklch = c.to('oklch').coords;  // [L, C, h] (L: 0-1, C: 0+, h: 0-360)
const hwb   = c.to('hwb').coords;    // [H, W, B] (0-1)
const xyz   = c.to('xyz-d65').coords; // [X, Y, Z]

// 创建并转换回 HEX
const c2 = new Color('oklch', [0.6, 0.2, 250]);
const hex = c2.to('srgb').toString({ format: 'hex' });
```

### 4.4 Harmony Rules (配色规则)

```javascript
const HARMONY_RULES = {
  complementary:  (h) => [h, (h + 180) % 360],
  analogous:      (h) => [h, (h + 30) % 360, (h - 30 + 360) % 360],
  triadic:        (h) => [h, (h + 120) % 360, (h + 240) % 360],
  split_complementary: (h) => [h, (h + 150) % 360, (h + 210) % 360],
  tetradic:       (h) => [h, (h + 90) % 360, (h + 180) % 360, (h + 270) % 360],
  square:         (h) => [h, (h + 90) % 360, (h + 180) % 360, (h + 270) % 360],
  monochromatic:  (h) => generateShades(h),
};
```

### 4.5 WCAG Contrast

```javascript
function getContrastRatio(fg, bg) {
  const l1 = chroma(fg).luminance();
  const l2 = chroma(bg).luminance();
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function wcagLevel(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}
```

### 4.6 K-means 主色调提取

```javascript
function extractDominantColors(imageData, k) {
  const pixels = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels.push([imageData.data[i], imageData.data[i+1], imageData.data[i+2]]);
  }
  // K-means clustering on pixels
  return kmeans(pixels, k).map(c => chroma.rgb(c).hex());
}
```

### 4.7 Export Utilities

```javascript
function exportCSS(colors) {
  return ':root {\n' + colors.map((c, i) => `  --color-${i+1}: ${c};`).join('\n') + '\n}';
}

function exportSCSS(colors) {
  return colors.map((c, i) => `$color-${i+1}: ${c};`).join('\n');
}

function exportTailwind(colors) {
  const entries = colors.map((c, i) => `        brand-${i+1}: '${c}',`);
  return `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n${entries.join('\n')}\n      }\n    }\n  }\n}`;
}
```

---

## 五、CSS 架构

### 5.1 CSS Variables

```css
:root {
  --ct-primary:        #6366f1;
  --ct-primary-hover:  #4f46e5;
  --ct-success:        #10b981;
  --ct-warning:        #f59e0b;
  --ct-error:          #ef4444;
  --ct-bg:             #fafbfc;
  --ct-card:           #ffffff;
  --ct-border:         #e2e8f0;
  --ct-text:           #0f172a;
  --ct-text-2:         #64748b;
  --ct-shadow-sm:      0 1px 2px rgba(0,0,0,.05);
  --ct-shadow-md:      0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04);
  --ct-r-sm:  6px;
  --ct-r-md:  10px;
  --ct-r-lg:  16px;
  --ct-fast:   150ms ease;
  --ct-normal: 250ms ease;
}

[data-theme="dark"] {
  --ct-bg:     #0f172a;
  --ct-card:   #1e293b;
  --ct-border: #334155;
  --ct-text:   #f1f5f9;
  --ct-text-2: #94a3b8;
}
```

### 5.2 命名约定

- `.ct-page` — 页面根容器
- `.ct-container` — 内容容器 (max-width: 1200px)
- `.ct-subnav` — 子导航栏
- `.ct-hero` — Hero 区域
- `.ct-section` — 内容区块
- `.ct-card` — 卡片组件
- `.ct-btn` — 按钮
- `.ct-input` — 输入框
- `.ct-picker-*` — picker 工具前缀
- `.ct-palette-*` — palette 工具前缀

---

## 六、i18n 翻译键

Color 工具使用 `common/i18n/{lang}/color.json` 命名空间：

```json
{
  "color.nav.hub": "工具首页",
  "color.nav.picker": "拾色器",
  "color.nav.palette": "调色板",
  "color.nav.wheel": "色轮",
  "color.nav.converter": "转换器",
  "color.nav.contrast": "对比度",
  "color.nav.gradient": "渐变",
  "color.nav.imagePicker": "图片取色",
  "color.nav.blindness": "色盲模拟",
  "color.nav.names": "颜色名称",
  "color.nav.mixer": "混合器",
  "color.nav.tailwind": "Tailwind",
  "color.hero.title": "专业颜色工具套件",
  "color.hero.subtitle": "拾取、生成、转换、检查颜色 — 全部在浏览器中完成",
  "color.hero.badge.privacy": "100% 隐私",
  "color.hero.badge.free": "完全免费",
  "color.hero.badge.tools": "12+ 工具"
}
```

---

## 七、新增 Color 工具检查清单

- [ ] 在 `color.go` 的 `colorSEO()` 中添加 SEO 数据
- [ ] 在 `color/tools.html` 的 `.ct-subnav` 中添加导航链接
- [ ] 在 `color/tools.html` 中添加工具 HTML 区块
- [ ] 在 `color-tools.js` 中添加 `ctInit{Tool}()` 初始化函数
- [ ] 在 `color-tools.js` 的 DOMContentLoaded 中注册初始化
- [ ] 在 `color-tools.css` 中添加工具样式
- [ ] 在 `common/i18n/{en,zh,ja,ko,spa}/color.json` 中添加翻译键
- [ ] 在 `router.go` 中注册路由
- [ ] 在 `index.html` 中添加工具卡片（如果是全新工具类别）
- [ ] 在 `faq/` 中添加 Color FAQ 数据（如需要）
