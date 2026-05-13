---
name: ga-audit
description: ToolboxNova GA（Google Analytics 4）埋点审计与修复技能。当用户提到以下任意情况时立即激活：「检查埋点」「GA 审计」「埋点缺失」「增加埋点」「ga audit」「tracking audit」「data-ga」「gaTrack」「google analytics」。激活后自动扫描整个项目的模板和 JS 文件，补全所有缺失的 GA 埋点，并运行审计脚本验证。
type: project
---

# ToolboxNova GA 埋点审计与修复规范

## 角色定义

你是一位熟悉 ToolboxNova 前端架构的 GA 埋点工程师。你理解 `data-ga` 属性、`ga-events.js` 公共库、`gaTrack*` 函数体系，以及如何通过自动追踪和显式埋点覆盖完整的用户行为链路。

## 项目约束（开发前必读）

- **模板引擎**：Go html/template，基础模板 `base.html`
- **前端**：原生 JavaScript（无框架），每个工具独立 JS 文件
- **GA 库**：`frontend/static/js/ga-events.js`，通过 `data-ga` 属性和 `gaTrack*` 函数上报
- **审计脚本**：`scripts/ga-audit.go`（Go 写的静态扫描器）
- **自动追踪**：`ga-events.js` 已包含 page_view、scroll_depth、outbound_click、tool_action、form_submit、file_download、tool_paste 等自动事件
- **显式埋点**：需要开发者手动在模板和 JS 中调用 `gaTrack*` 函数

---

## 一、触发条件

| 关键词 | 示例 |
|--------|------|
| 「检查埋点」 | 帮我检查下埋点有没有遗漏 |
| 「GA 审计」 | run ga-audit / 执行 GA 审计 |
| 「增加埋点」 | 新工具需要加埋点 |
| 「tracking audit」 | audit GA tracking |
| 「data-ga」「gaTrack」 | 检查 data-ga 和 gaTrack 覆盖 |

---

## 二、执行流程

### Step 1 — 运行审计脚本

```bash
go run scripts/ga-audit.go .
```

脚本输出关键指标：
- `Templates with data-ga` — 已加 data-ga 的模板数 / 总数
- `JS files with gaTrack` — 已加 gaTrack 的 JS 文件数 / 总数
- `Undefined gaTrack functions` — 引用了但没定义的函数（必须为 0）
- `Unused gaTrack functions` — 定义了但没引用的函数（应为 0 或极少）
- `Total issues` — 剩余问题数（info 级别可接受，warn/error 必须修复）

### Step 2 — 修复模板（data-ga）

对每个被 flag 为 "template has no data-ga" 的模板：

1. **Read** 文件，定位 `{{ define "content" }}` 后的根 `<div>`
2. 添加 `data-ga="page_slug"` 到根容器，例如：
   ```html
   <div class="container static-page" data-ga="about_page">
   ```
3. 为页面上的主要按钮/链接添加 `data-ga`：
   - 提交按钮：`data-ga="contact_submit"`
   - CTA 链接：`data-ga="guide_cta"`
   - Tab 切换：`data-ga="tab_switch_name"`
4. **Skip 列表**（不需要 data-ga 的模板）：
   - `base.html`, `tools_base.html`, `json/_base.html`
   - `partials/` 目录下的所有 partial（navbar, ad_slot, ga, cookie-consent 等）
   - `email/` 目录下的邮件模板

### Step 3 — 修复 JS 文件（gaTrack）

对每个被 flag 为 "JS file has no gaTrack calls" 的 JS 文件：

1. **Read** 文件，找到**主用户操作函数**（通常是 `processJson()`、`detect()`、`humanize()`、`generate()`、`compress()` 等）
2. 在函数**开始处**插入：
   ```js
   var _gaStart = Date.now();
   if (typeof gaTrackToolUse === 'function') gaTrackToolUse('TOOL-NAME');
   ```
3. 在**处理成功完成**处插入：
   ```js
   if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('TOOL-NAME', 1, Date.now() - _gaStart);
   ```
   如果是批量处理（如图片压缩多张），`fileCount` 改为实际处理数量。
4. 如果有**复制结果**功能：
   ```js
   if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('TOOL-NAME', 'text');
   ```
5. 如果有**下载/导出**功能：
   ```js
   if (typeof gaTrackDownload === 'function') gaTrackDownload('TOOL-NAME', 'txt');
   ```
   图片工具用 `'image/jpeg'`，JSON 工具用 `'json'`，ZIP 用 `'application/zip'`。

### Step 4 — Re-audit 验证

再次运行：
```bash
go run scripts/ga-audit.go .
```

确认：
- ❌ 没有 `error` 级别 issue
- ❌ 没有 `Undefined gaTrack functions`
- ✅ `Total issues` ≤ 85（剩余的 info 级别 "auto-derived ToolName" 是预期的）

---

## 三、命名规范

### 3.1 工具名（kebab-case）

| 文件名 | 工具名 |
|--------|--------|
| `ai-detector.js` | `ai-detector` |
| `img-compress.js` | `img-compress` |
| `json-tool-pretty.js` | `json-tool-pretty` |
| `pdf-merge.js` | `pdf-merge` |
| `tools_timestamp.js` | `timestamp` |
| `media-qr-engine.js` | `qr-generator` |

规则：从 URL path slug 推导，例如 `/img/compress` → `img-compress`，`/tools/timestamp` → `timestamp`。

### 3.2 data-ga 事件名

- 页面根容器：`{page}_page`，如 `about_page`、`privacy_page`
- 主要按钮：`{action}_{target}`，如 `contact_submit`、`guide_cta`
- Tab 切换：`{prefix}_filter_{type}`，如 `proxy_filter_all`、`proxy_filter_http`
- 分页：`{prefix}_page_{direction}`，如 `proxy_page_prev`

---

## 四、Skip 列表（永不埋点）

以下文件类型**不需要**添加 `gaTrack`，审计脚本已内置豁免：

| 文件/目录 | 原因 |
|-----------|------|
| `ga-events.js` | GA 公共库本身 |
| `consent-engine.js` | Cookie 同意引擎 |
| `theme.js` | 主题切换 |
| `main.js` | 全局入口（已包含通用追踪） |
| `learn-articles/*.js` | 纯文章数据文件（只有 HTML 字符串） |
| `datasets-meta.js` | 纯元数据数组 |
| `json-codegen-core.js` | 共享类型工具函数 |
| `json-tool-descriptions.js` | 工具描述常量 |
| `platform-icons.js` | Icon 注册表 |
| `ai-tool-nav.js` | 导航下拉（无业务逻辑） |
| `img-tabs.js` | Tab 切换 UI（21 行，纯 toggle） |
| `json-home.js` | 搜索过滤（已加 `gaTrackSiteSearch`） |

---

## 五、ga-events.js 函数速查

```javascript
gaTrackToolUse(toolName)           // 工具开始
#gaTrackProcessDone(toolName, fileCount, durationMs)  // 工具完成
gaTrackResultCopy(toolName, contentType)   // 复制结果
gaTrackDownload(toolName, fileType)      // 下载文件
gaTrackUpload(toolName, fileCount, totalSizeMB)  // 文件上传
gaTrackSettingChange(toolName, settingName, value) // 设置变更
gaTrackError(toolName, errorType, errorMsg) // 错误
gaTrackShare(toolName, method)      // 分享
gaTrackConversion(toolName, label)   // Google Ads 转化
gaTrackTabSwitch(tabName, group, toolName) // Tab 切换
gaTrackModalOpen(modalName, toolName)      // 弹窗打开
gaTrackFormSubmit(formName, toolName)      // 表单提交
gaTrackExport(toolName, format)      // 导出
gaTrackSiteSearch(searchType, query, resultCount) // 站内搜索
gaTrackLanguageChange(from, to)      // 语言切换
gaTrackThemeChange(theme)           // 主题切换
gaTrackPageView(pagePath)           // 手动 page_view
gaTrackEngagedVisit()               // 互动访问（30s+）
```

---

## 六、报告格式

审计完成后输出：

```
╔══════════════════════════════════════════════════════════════╗
║        ToolBoxNova GA Tracking Audit Report                  ║
╚══════════════════════════════════════════════════════════════╝

✅ Templates with data-ga:       N / M
✅ JS files with gaTrack:        N / M
✅ Undefined gaTrack functions:  0
✅ Unused gaTrack functions:     0

Files changed: {count}
  - templates: {list}
  - js: {list}

Issues before: {before}
Issues after:  {after}

Audit: PASSED
```

---

## 七、不要做的事情

- **不要把 gaTrack 加到 Skip 列表中的文件** — 审计脚本已豁免，额外添加会污染数据
- **不要重复定义 `_gaStart`** — 每个主函数只定义一次，在 `gaTrackToolUse` 之前
- **不要把 `typeof gaTrackXxx === 'function'` 检查漏掉** — 防止 GA 未加载时抛错
- **不要在错误路径上调用 `gaTrackProcessDone`** — 只在成功完成时调用，错误用 `gaTrackError`
- **不要硬编码中文事件名** — 全部使用英文 kebab-case，如 `img-compress`，不要用 `图片压缩`
- **不要给 base/layout/partials 模板加 data-ga** — 这些是被引用的模板，不是独立页面
- **不要把 `gaTrackToolUse` 放在事件监听器外层** — 必须在用户触发动作的内部调用
