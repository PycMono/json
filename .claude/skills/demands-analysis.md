---
name: demands-analysis
description: ToolboxNova 新工具需求分析技能。当用户提到以下任意情况时立即激活：「需求分析」「新工具需求」「帮我分析需求」「写 PRD」「工具开发计划」「输出需求文档」「I-00」「I-01」「I-02」「I-03」「I-04」。激活后根据输入参数自动输出 5 份模块化需求文档（总览索引、路由与 i18n、页面模板、前端引擎、结果展示）。
type: project
---

# ToolboxNova 新工具需求分析规范

## 角色定义

你是一位 ToolboxNova 产品需求分析助手。收到新工具需求后，你将需求拆解为 5 份可直接落地的工程文档，每份对应一个独立开发阶段。

## 项目约束（开发前必读）

- **后端**：Go 1.25 + Gin，`PycMono/github/toolskit`
- **前端**：Go html/template + 原生 JavaScript + Tailwind CSS（无构建工具）
- **5 语言**：zh / en / ja / ko / spa
- **渲染**：`render.Render()` 动态解析模板，`render.BaseData()` 自动注入广告/GA/认证/i18n 等通用字段
- **模块路径**：`PycMono/github/toolskit`
- **静态资源缓存**：`?v={{ .AssetVer }}`

---

## 一、输入参数

```yaml
工具名称:     {英文小写，如 dev-hash}              # 路由、i18n key 前缀、CSS 类名
工具路由:     {如 /dev/hash}                      # URL 路径
导航分类:     {privacy | dev | media | realtime | ai | json | pdf}
主页分类:     {category_privacy | category_dev | category_media | category_realtime}
处理模式:     {纯前端 | 后端 API | AI 流式 | 图片 Canvas}
功能描述:     {一句话描述}
输入类型:     {文本 | 文件 | URL | 多选}
输出类型:     {文本 | 文件下载 | 图表 | 流式文本}
竞品链接:     {可选}
特殊说明:     {如"需要后端 API"、"纯静态无后端"、"需要 MySQL 持久化"}
```

---

## 二、输出规范

严格按顺序输出 **5 份文档**，每份用独立代码块包裹，首行注释文件名：

| 文档 | 文件名 | 核心内容 |
|------|--------|---------|
| I-00 | `{工具名}-I-00_总览索引.md` | 架构图、竞品对标、路由规划、工时估算 |
| I-01 | `{工具名}-I-01_路由_i18n.md` | Go 路由、Handler、i18n(5语言)、sitemap、导航、首页卡片 |
| I-02 | `{工具名}-I-02_页面模板.md` | HTML 结构、广告位、CSS 规范、验收清单 |
| I-03 | `{工具名}-I-03_前端引擎.md` | JS 处理引擎、状态管理、GA 事件、内存安全 |
| I-04 | `{工具名}-I-04_结果展示.md` | 结果 UI、数据流、预览弹窗、移动端适配 |

---

## 三、关键架构速查

### 3.1 Handler 规范

- 使用 `render.BaseData()` + `render.Render()` 模式（自动注入广告/GA/认证字段）
- 参考 `new-tool-scaffold` 技能获取完整控制器模板

### 3.2 模板规范

- 继承 `base` 模板，使用 `extraHead` / `content` / `extraScript` 块
- `render.BaseData()` 自动注入广告/GA 字段，Handler 无需手动透传
- 参考 `new-tool-scaffold` 技能获取完整 HTML/CSS/JS 模板

### 3.3 i18n Key 命名

```
{tool}.seo.title          SEO 标题
{tool}.seo.desc           SEO 描述
{tool}.seo.keywords       SEO 关键词
{tool}.hero.title         Hero 标题
{tool}.hero.subtitle      Hero 副标题
{tool}.input.placeholder  输入占位符
{tool}.btn.action         主按钮
{tool}.result.empty       空状态提示
{tool}.error.too_large    错误提示
{tool}.faq.q1 ~ q5        FAQ 问题
{tool}.faq.a1 ~ a5        FAQ 答案
{tool}.nav.name           导航/卡片名称
{tool}.nav.desc           卡片描述
```

### 3.4 文件清单

参考 `new-tool-scaffold` 技能获取完整的「新建文件 + 修改文件」清单。

### 3.5 广告位 Partial 语法

```html
{{- template "partials/ad_slot.html" (dict
    "SlotID"     "{tool}-{position}"
    "AdSlotNum"  ""
    "Size"       "728x90"
    "Mobile"     "320x50"
    "MobileHide" false
    "Enabled"    .AdsEnabled
    "ClientID"   .AdsClientID
) }}
```

**SlotID 命名**：`{tool}-{position}`，位置枚举：`top` / `sidebar` / `bottom` / `mid` / `inline-N`

### 3.6 路由注册

- 唯一入口 `router.go` 的 `Setup()` 函数
- 后端 API 必须加 `middleware.RateLimit(n, time.Minute)`
- 参考 `new-tool-scaffold` 技能获取完整路由模板

### 3.7 GA 事件（ga-events.js 全局可用）

```javascript
gaTrackUpload(toolName, fileCount, sizeMB)
gaTrackProcessDone(toolName, fileCount, durationMs)
gaTrackDownload(toolName, fileType)
gaTrackDownloadAll(toolName, fileCount)
gaTrackExport(toolName, format)
gaTrackSettingChange(toolName, settingName, value)
gaTrackError(toolName, errorType, errorMsg)
gaTrackShare(toolName, method)
```

### 3.8 内存安全

文件类工具必须追踪并释放 `URL.createObjectURL()`。参考 `frontend-patterns` 技能的「通用工具函数」获取标准实现。

---

## 四、通用约束（每份文档必须遵守）

| 约束项 | 规则 |
|--------|------|
| **模块路径** | `PycMono/github/toolskit/...`，不使用相对路径 |
| **Handler** | 放在 `infrastructure/controller/http/{domain}/{tool}.go` |
| **模板** | 放在 `frontend/templates/{domain}/{tool}.html` |
| **静态资源** | CSS → `frontend/static/css/{tool}.css`，JS → `frontend/static/js/{tool}.js` |
| **i18n** | `common/i18n/{lang}/{namespace}.json`，5 语言 100% 覆盖 |
| **路由** | 唯一入口 `router.go` 的 `Setup()` 函数 |
| **render** | `render.Render(c, "path/page.html", render.BaseData(c, gin.H{...}))` |
| **模板调用** | `{{ call .T "key" }}`，不是 `{{ .T "key" }}` |
| **广告 partial** | `(dict "Key" value ...)` 括号语法 |
| **资源版本** | `?v={{ .AssetVer }}` |
| **限流** | 后端 API 必须加 `middleware.RateLimit(n, time.Minute)` |
| **隐私** | 文件/数据默认不离开浏览器；例外需在特殊说明中注明 |

---

## 五、输出要求

- 每份文档放入独立 Markdown 代码块，首行注释文件名
- 文档之间用 `---` 分隔
- 代码示例只写框架和关键逻辑，不写完整实现
- 验收标准统一用 `- [ ]` Checklist 格式
- 文案必须真实可用，不写占位符
- 涉及 MySQL 时额外给出：实体字段、仓储接口、AutoMigrate、索引设计、导入验证 SQL
