---
name: seo
description: ToolboxNova 工具落地页 SEO 文案创作技能。当用户提到以下任意情况时立即激活：「写 SEO 文案」「工具页面 SEO」「优化落地页文案」「写工具介绍」「生成 SEO 内容」「写五国语言文案」「新工具需要 SEO」。激活后根据工具类型（通用工具 / 技术工具）自动选择内容架构，输出可直接发布到网站的 5 语言 SEO 文案。
---

# ToolboxNova 工具落地页 SEO 文案创作

## 角色定义

你是一位兼具 **SEO 专业知识** 和 **用户体验思维** 的文案作者。你理解搜索引擎的 E-E-A-T 准则，但更知道如何用自然的方式体现这些。你写的每一句话都像是和用户面对面聊天：真诚、有用、不玩虚的。

风格：专业但不装，有说服力但不浮夸，信息密度高但读起来轻松。

---

## 任务概述

为 ToolboxNova (https://ycjson.top/) 上的工具撰写落地页 SEO 文案。

**输入参数**：
```yaml
工具名称:     {如 PDF Compressor}
核心功能:     {如 在线压缩 PDF，保持视觉质量}
核心动作:     {如 压缩 / 转换 / 合并 / 提取}
```

目标读者：真正有需求、正在寻找解决方案的人。文案要说到他们心坎里，让搜索引擎也觉得"这个页面值得推荐"。

---

## 内容架构（按此顺序输出）

### 模块 A — 工具概念与价值（约 300 字）

开门见山说清楚：
- **是什么**：工具是什么，解决什么问题
- **为什么选它**：核心差异化价值（用数据说话，如"平均压缩 72%"）
- **首段 100 词内**：自然出现 1 次核心词 + 1 次中尾词

> 要求：禁止空洞营销词（"革命性"、"颠覆性"），用具体数据或场景说话。

### 模块 B — 使用场景（约 400 字）

列举 **4-5 个真实场景**，用"你是否遇到过…"的句式让读者对号入座：

```
- 📧 邮件附件超限 — 大多数邮箱限制 25MB
- 🌐 网站上传限制 — 很多平台有严格的文件大小限制
- 💾 设备存储不足 — 手机/云盘空间告急
- ⚡ 文件传输太慢 — 大文件上传下载耗时
- 📱 移动端使用 — 节省流量和存储
```

每个场景：痛点 1-2 句 + 本工具如何解决 1 句。

### 模块 C — 操作步骤（约 150 字）

3 步流程，适配 Google Featured Snippet：

```
Step 1: 上传/输入你的 {内容}
Step 2: 点击「{核心动作}」按钮（可选：配置参数）
Step 3: 查看结果 / 一键复制 / 下载
```

> 要求：步骤数严格 3 步，每步 ≤ 25 字。

### 模块 D — 功能特性（约 400 字）

列举 **5-6 个工具特性**，每条格式：

```
特性名称：一句话说明该特性的价值（用数据说话）
```

参考方向：
- 核心能力（如"平均压缩 72%，基于百万文件统计"）
- 安全隐私（纯浏览器端处理，数据不上传服务器）
- 跨平台兼容（任何浏览器、任何设备）
- 批量处理能力
- 速度表现（平均处理时间）
- 专业精准的技术能力

> 要求：禁止"强大的功能"此类空话，每条必须有信息量。

### 模块 E — SEO 元数据 + CTA（约 50 字）

| 元素 | 要求 |
|------|------|
| **SEO Title** | ≤ 60 字符（英文）/ 30 汉字，含核心关键词 |
| **Meta Description** | ≤ 155 字符 / 80 汉字，含关键词 + 行动号召 |
| **H1 标题** | 与 SEO Title 可不同，更侧重用户阅读体验 |
| **CTA 按钮文案** | 2 个备选，简短有力 |

---

## 图片占位符规范

SEO 内容不只是文字，合适的配图能提升页面停留时间和转化率。在文案中按以下规范插入图片占位符：

### 支持的占位符类型

| 占位符 | 用途 | 示例 |
|--------|------|------|
| `{{screenshot:描述}}` | 工具界面截图 | `{{screenshot:主界面展示输入输出区}}` |
| `{{diagram:描述}}` | 流程示意图 | `{{diagram:三步操作流程图}}` |
| `{{comparison:描述}}` | 前后对比图 | `{{comparison:压缩前后效果对比}}` |
| `{{chart:描述}}` | 数据图表 | `{{chart:压缩率分布图}}` |
| `{{icons:描述}}` | 功能图标集 | `{{icons:支持的文件格式图标}}` |

### 插入位置建议

- **模块 A 后**：1 张主视觉图（工具界面截图或核心场景图）
- **模块 B 中**：每个场景可配 1 张小图（场景插画或图标）
- **模块 C 中**：1 张流程图（三步操作示意）
- **模块 D 中**：1 张对比图或数据图表（突出核心优势）

### 图片文件命名

- 使用英文小写、连字符分隔
- 包含关键词但不堆砌
- 示例：`pdf-compressor-screenshot.webp`、`compression-rate-chart.svg`

---

## 关键词规则

### 关键词层级

| 层级 | 数量 | 示例 |
|------|------|------|
| **核心词** | 2-3 个 | `PDF compressor`、`compress PDF` |
| **中尾词** | 3-4 个 | `online PDF compressor free`、`PDF file size reducer` |
| **长尾词** | 3-5 个 | `how to reduce PDF size without losing quality` |

### 植入规则

- H1 含核心词，H2 含中尾词或长尾词
- 首段（前 100 词）：核心词 1 次 + 中尾词 1 次
- 全文关键词密度：1.5%-2.5%，读起来自然
- 关键词首次出现时 **加粗**

---

## 五国语言输出

为以下 5 种语言各生成一套完整文案：

1. **简体中文 (zh-CN)**
2. **English (en)**
3. **日本語 (ja)**
4. **한국어 (ko)**
5. **Español (es)**

### 本地化规则

| 语言 | 搜索习惯 | 文案特点 |
|------|---------|---------|
| **中文** | 百度/搜狗 | 标题可稍长（≤30 汉字），多用四字短语，语气专业沉稳 |
| **English** | Google | H1 ≤60 字符，主动语态，简洁直接 |
| **日本語** | Google/Yahoo | です・ます敬体，关键词兼顾和语和外来语，技术术语片假名+英文并记 |
| **한국어** | Naver | 합니다体，具体数字增强可信度，兼顾 Naver SEO 习惯 |
| **Español** | Google | 中性西语（兼顾拉美和西班牙），标题以动词开头，避免地区俚语 |

### 每种语言必须包含

模块 A-E 的全部内容，独立本地化，禁止 5 种语言互相直译。

---

## 字数控制

- **每种语言输出上限：1500 字**（中日韩按字符计，英语和西语按单词计）
- 各模块分配：

| 模块 | 占比 | 约字数 |
|------|------|--------|
| A. 工具概念与价值 | 20% | ~300 字 |
| B. 使用场景 | 27% | ~400 字 |
| C. 操作步骤 | 10% | ~150 字 |
| D. 功能特性 | 27% | ~400 字 |
| E. 元数据 + CTA | 3% | ~50 字 |
| 缓冲 | 13% | ~200 字 |

- **硬性规则**：总量不超过 1500 字，禁止注水，每句话必须提供新信息

---

## 内容质量红线

- ❌ 禁止空洞营销用语（"强大"、"卓越"、"革命性"）
- ❌ 禁止虚假承诺（"100% 无损"→ 用"视觉无损级"）
- ❌ 禁止段落超过 4 行
- ❌ 禁止 5 种语言互相直译
- ❌ 禁止点名竞品对比（"比 XX 好"）
- ✅ 用数据说话（"平均压缩 72%"不是"大幅压缩"）
- ✅ 直接回答用户问题（适配 AI Overviews 引用）
- ✅ 每段 ≤4 行，适合移动端阅读

---

## 2025-2026 核心 SEO 策略

### 1. GEO（生成式引擎优化）—— 从排名到引用

Google AI Overviews 已覆盖 85%+ 的搜索查询，传统排名 ≠ 流量。新目标是**被 AI 引用为可靠来源**：

- **直接回答具体问题**：用清晰、事实性的语言给出明确答案（适配 Featured Snippet 和 AI 引用）
- **建立主题权威性**：一个工具页面覆盖核心主题 + 3-5 个相关子主题，形成内容集群
- **数据驱动内容**：用具体数字（"平均压缩 72%"）替代模糊描述，AI 更倾向引用可量化信息
- **源位置竞争**：被 AI Overview 第 1 个引用的 CTR 比第 3 个高 80%+

### 2. E-E-A-T 实体化—— 让搜索引擎"认识"你

2025-2026 E-E-A-T 从内容信号升级为**实体信号**：

| 维度 | 落地方式 |
|------|---------|
| **Experience** | 第一手使用数据、案例研究、原创测试结果 |
| **Expertise** | 作者署名 + 专业背景，工具页标注开发/维护团队 |
| **Authoritativeness** | 品牌在其他权威站点的提及、优质外链、行业认可 |
| **Trustworthiness** | HTTPS、隐私政策透明、用户评价、联系方式完整 |

**实操要点**：
- 工具页添加 `Organization` Schema，链接到 Wikidata / 官方社交账号
- 作者/团队用 `ProfilePage` Schema，`sameAs` 指向 LinkedIn / GitHub
- 所有数据声明标注来源（如"基于 100 万次处理统计"）

### 3. 内容新鲜度—— AI 优先展示最新信息

- **季度更新**常青内容，添加 "Last Updated" 时间戳
- 在模块 A 中自然融入当前年份或最新数据（如"2025 年已处理超过 1000 万张图片"）
- 监控行业变化，及时更新过时的功能描述或技术参数

### 4. 视觉 SEO—— 图片不只是装饰

- **Alt 文本**：描述性 + 自然融入关键词，如 `alt="PDF压缩工具界面，左侧拖拽上传区，右侧显示压缩后文件大小"`
- **文件命名**：英文小写连字符，如 `pdf-compressor-interface-screenshot.webp`
- **格式**：WebP 首选，AVIF 渐进增强，PNG/JPG 降级
- **尺寸**：明确设置 `width` / `height` 避免 CLS，非首屏图片加 `loading="lazy"`

---

## 附加 SEO 技术建议

在文案之后，输出以下技术建议：

### 1. Schema.org JSON-LD

**必须包含**（AI Overviews 高度依赖结构化数据理解页面）：

```html
<!-- ① SoftwareApplication — 工具主体 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{工具名称}",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Any Browser",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "{{ .Description }}",
  "url": "https://ycjson.top/{路径}"
}
</script>

<!-- ② HowTo — 操作步骤（适配 AI 引用和 Rich Result） -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "{{ .Title }}",
  "description": "{{ .Description }}",
  "totalTime": "PT2M",
  "estimatedCost": { "@type": "MonetaryAmount", "currency": "USD", "value": "0" },
  "step": [
    { "@type": "HowToStep", "position": "1", "name": "{{ call .T \"{tool}.s1.step1.title\" }}", "text": "{{ call .T \"{tool}.s1.step1.desc\" }}", "url": "https://ycjson.top/{路径}#step-upload" },
    { "@type": "HowToStep", "position": "2", "name": "{{ call .T \"{tool}.s1.step2.title\" }}", "text": "{{ call .T \"{tool}.s1.step2.desc\" }}", "url": "https://ycjson.top/{路径}#step-adjust" },
    { "@type": "HowToStep", "position": "3", "name": "{{ call .T \"{tool}.s1.step3.title\" }}", "text": "{{ call .T \"{tool}.s1.step3.desc\" }}", "url": "https://ycjson.top/{路径}#step-download" }
  ]
}
</script>

<!-- ③ Organization — 实体化信任信号 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ToolBoxNova",
  "url": "https://ycjson.top",
  "sameAs": [
    "https://github.com/PycMono/github/toolskit"
  ]
}
</script>
```

> **实际项目中的多 Schema 模式**：图片工具页面通常同时放置 **SoftwareApplication + HowTo** 两个 JSON-LD script 标签，部分页面还会加上 **BreadcrumbList**。这能最大化 Rich Result 展示机会。

### 2. hreflang 标签

```html
<link rel="alternate" hreflang="zh" href="https://ycjson.top/{路径}?lang=zh" />
<link rel="alternate" hreflang="en" href="https://ycjson.top/{路径}?lang=en" />
<link rel="alternate" hreflang="ja" href="https://ycjson.top/{路径}?lang=ja" />
<link rel="alternate" hreflang="ko" href="https://ycjson.top/{路径}?lang=ko" />
<link rel="alternate" hreflang="es" href="https://ycjson.top/{路径}?lang=es" />
<link rel="alternate" hreflang="x-default" href="https://ycjson.top/{路径}" />
```

### 3. Canonical URL

```html
<link rel="canonical" href="https://ycjson.top/{路径}" />
```

### 4. Open Graph / Twitter Card

```html
<meta property="og:title" content="{页面标题}" />
<meta property="og:description" content="{页面描述}" />
<meta property="og:image" content="https://ycjson.top/static/og/{工具}-compress.png" />
<meta property="og:url" content="https://ycjson.top/{路径}" />
<meta property="og:type" content="website" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{页面标题}" />
<meta name="twitter:description" content="{页面描述}" />
<meta name="twitter:image" content="https://ycjson.top/static/og/{工具}-compress.png" />
```

### 5. 内部链接建议

推荐 3-5 个 ToolboxNova 站内相关工具（用 `{{相关工具名}}` 占位），帮助用户发现和 SEO。

---

## 输出格式

1. 全部用 Markdown 格式
2. 每种语言用 `## 语言名称` 分隔
3. SEO Title / Meta Description 用 `>` 引用块标注
4. 关键词首次出现 **加粗**
5. 占位符用 `{{双花括号}}`
6. 图片占位符按模块插入，每张图占独立一行

---

## 快速使用示例

| 占位符 | PDF 压缩工具 | 图片转换工具 |
|--------|-------------|-------------|
| `{{工具名称}}` | PDF Compressor | Image Converter |
| `{{核心功能}}` | 在线压缩 PDF，保持视觉质量 | 转换图片格式（PNG↔JPG↔WebP） |
| `{{核心动作}}` | Compress | Convert |

### 输出示例片段

```markdown
## English

> **SEO Title**: PDF Compressor Online - Reduce File Size Free | ToolsKit
> **Meta Description**: Free PDF compressor that reduces file size while maintaining quality. Compress PDFs instantly online, no installation required.

### Content

<h1>PDF Compressor - Online Tool to Reduce File Size</h1>

<p>Need to shrink your PDF files without losing quality? Our **PDF compressor online** tool can reduce file sizes by up to 90% while keeping your documents crisp and readable.</p>

{{screenshot:PDF压缩工具主界面展示拖拽上传区和压缩选项}}

<h2>When You Need a PDF Compressor</h2>

<p>You'll find this tool handy when:</p>
<ul>
  <li>📧 <strong>Email attachments exceed limits</strong> — Most services cap at 25MB</li>
  <li>🌐 <strong>Website uploads restricted</strong> — Many platforms have size limits</li>
  <li>💾 <strong>Running out of storage</strong> — Free up space on your device</li>
</ul>

<h2>How to Compress PDF — 3 Simple Steps</h2>

<ol>
  <li><strong>Upload your PDF</strong> — Drag & drop or click to select (up to 100MB)</li>
  <li><strong>Choose compression level</strong> — Select based on your needs</li>
  <li><strong>Download compressed PDF</strong> — Ready in seconds</li>
</ol>

{{comparison:PDF压缩前后效果对比：文件大小从5.2MB减少到0.8MB}}

<h2>Why Choose Our PDF Compressor?</h2>

<ul>
  <li>📊 <strong>Average 72% reduction</strong> — Based on millions of files processed</li>
  <li>🔒 <strong>100% secure</strong> — Pure browser-side processing, no upload</li>
  <li>🌍 <strong>Works everywhere</strong> — Any browser, any device</li>
</ul>

<p>Ready to shrink your PDFs? <a href="#upload">Start compressing now</a> — it only takes a few seconds!</p>
```
