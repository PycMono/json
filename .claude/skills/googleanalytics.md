---
name: googleanalytics
description: ToolboxNova Google Analytics 4（GA4）接入与事件追踪工程规范技能。当用户提到以下任意情况时立即激活：「GA」「Google Analytics」「埋点」「gtag」「GA4」「统计页面」「追踪用户行为」「新页面加 GA」「ga-events」「事件追踪」。激活后自动判断场景类型（存量迁移 / 新业务接入 / 事件补埋），按对应流程输出可直接使用的代码。
type: project
---

# ToolboxNova Google Analytics 4 工程规范

## 角色定义

你是负责 ToolboxNova GA4 接入与事件追踪管理的工程助手。项目 GA 已由 `base.html` 统一处理加载和 Consent Mode v2，各工具页面只需在业务 JS 中调用 `ga-events.js` 提供的追踪函数。

## 项目约束（开发前必读）

- **GA 加载**：`base.html` 已自动处理 gtag.js 加载、Consent Mode v2 初始化、`gtag('config')`
- **配置来源**：`config.json` → `infrastructure/config/config.go`
- **中间件注入**：`infrastructure/middleware/ga.go` 的 `GAConfig()` 全局挂载
- **Handler 无需手动透传**：`render.BaseData()` 已自动注入 `EnableGA`、`GAMeasurementID`、`GoogleAdsConversionID`、`GoogleAdsConversionLabel` 等
- **事件库**：`frontend/static/js/ga-events.js` 全局加载，所有工具页面直接调用
- **Consent 自动拦截**：`analytics_storage: denied` 时 gtag 事件自动静默，业务 JS 无需检查

---

## 一、Config 规范

```go
// infrastructure/config/config.go
type Config struct {
    // ... 其他字段 ...
    GAMeasurementID          string // GA4 Measurement ID，如 "G-XXXXXXXXXX"
    EnableGA                 bool   // GA 总开关
    GoogleAdsConversionID    string // Google Ads 转化 ID
    GoogleAdsConversionLabel string // Google Ads 转化标签
}
```

配置文件示例：

```json
// config.json（生产环境）
{
  "ga_measurement_id": "G-XXXXXXXXXX",
  "enable_ga": true,
  "google_ads_conversion_id": "AW-XXXXXXXXX",
  "google_ads_conversion_label": "XXXXXXXXXXXXXXXX"
}

// config.json（开发环境）
{
  "ga_measurement_id": "",
  "enable_ga": false
}
```

> **禁止在 Handler、模板、JS 任何位置硬编码 `G-` 开头的 Measurement ID。**

---

## 二、中间件

```go
// infrastructure/middleware/ga.go
func GAConfig(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Set("GAMeasurementID", cfg.GAMeasurementID)
        c.Set("EnableGA", cfg.EnableGA)
        c.Set("GoogleAdsConversionID", cfg.GoogleAdsConversionID)
        c.Set("GoogleAdsConversionLabel", cfg.GoogleAdsConversionLabel)
        c.Next()
    }
}
```

已在 `router.go` 的 `Setup()` 中全局挂载：

```go
r.Use(middleware.GAConfig(cfg))
```

**所有页面自动获得 GA 配置**，Handler 无需额外操作。

---

## 三、Handler 规范

**不需要**在 Handler 中手动透传 GA 字段，`render.BaseData()` 已自动注入：

```go
func {Tool}Page(c *gin.Context) {
    t := render.GetT(c)
    data := render.BaseData(c, gin.H{
        "Title":     t("{tool}.seo.title"),
        "Description": t("{tool}.seo.desc"),
        "PageClass": "page-{tool}",
        // EnableGA / GAMeasurementID / GoogleAdsConversionID 已自动注入
    })
    render.Render(c, "{tool}.html", data)
}
```

---

## 四、前端规范

### 4.1 GA 加载（已由 base.html 自动处理）

`base.html` 已包含以下内容，**子页面不要重复写**：

- Consent Mode v2 默认脚本（第一个 `<script>`）
- gtag.js 异步加载（`EnableGA` 控制）
- `gtag('config', GAMeasurementID)`（Consent 授权后自动发送）
- `ga-events.js` 全局加载

子页面 `extraHead` 中**不要**放任何 GA 相关代码。

### 4.2 事件追踪标准函数

`frontend/static/js/ga-events.js` 已由 `base.html` 全局加载，各工具页面直接调用：

```javascript
// 文件上传
gaTrackUpload(toolName, fileCount, sizeMB)

// 处理完成
gaTrackProcessDone(toolName, fileCount, durationMs)

// 单文件下载
gaTrackDownload(toolName, fileType)

// 批量 ZIP 下载
gaTrackDownloadAll(toolName, fileCount)

// 导出格式
gaTrackExport(toolName, format)

// 参数变更（如压缩质量、输出格式）
gaTrackSettingChange(toolName, settingName, value)

// 错误发生
gaTrackError(toolName, errorType, errorMsg)

// 分享 / 复制链接
gaTrackShare(toolName, method)

// 用户参与（30s 停留自动触发，base.html 内置，无需手动调用）
// gaTrackEngagedVisit()
```

### 4.3 各工具标准埋点示例

```javascript
// {tool}.js 中按需调用

// ① 文件上传后
function onFilesAdded(files) {
  const totalMB = files.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
  gaTrackUpload('{tool}', files.length, totalMB);
}

// ② 处理完成
const _startTime = Date.now();
function onProcessDone(fileCount) {
  gaTrackProcessDone('{tool}', fileCount, Date.now() - _startTime);
}

// ③ 下载
function onDownload(file) {
  gaTrackDownload('{tool}', file.type || 'image/jpeg');
}

// ④ 批量下载
function onDownloadAll(files) {
  gaTrackDownloadAll('{tool}', files.length);
}

// ⑤ 参数变更
function onSettingChange(name, value) {
  gaTrackSettingChange('{tool}', name, value);
}

// ⑥ 错误
function onError(type, msg) {
  gaTrackError('{tool}', type, msg);
}
```

### 4.4 自定义 data-ga 属性（HTML 元素点击追踪）

首页工具卡片等静态链接使用 `data-ga` + `data-ga-category` 属性：

```html
<a href="/{tool}?lang={{ .Lang }}" class="tool-card"
   data-ga="card_{tool}" data-ga-category="home_tools">
  ...
</a>
```

由 `ga-events.js` 自动代理收集，无需手动调用。

---

## 五、场景 A · 存量迁移

### Step 1：扫描硬编码 GA 代码

识别以下模式，均视为需要迁移：

```html
<!-- 模式 1：直接写死 Measurement ID -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- 模式 2：旧版 Universal Analytics -->
<script async src="https://www.google-analytics.com/analytics.js"></script>

<!-- 模式 3：模板中硬编码 GAID -->
{{ .GAID }}
```

### Step 2：清理模板

子页面 `extraHead` 中删除所有 GA 相关代码，由 `base.html` 统一处理。

### Step 3：存量迁移验收清单

- [ ] 所有模板中硬编码 `G-XXXXXXXXXX` 已删除
- [ ] 子页面 `extraHead` 中没有 gtag 初始化代码
- [ ] `base.html` 中 GA partial 调用正确（已由项目统一处理）
- [ ] `ga-events.js` 在页面底部引入（已由 base.html 全局加载）
- [ ] 业务 JS 中核心操作已添加 gaTrack* 调用
- [ ] dev 环境 `EnableGA=false`，无 GA 请求发出

---

## 六、场景 B · 新业务接入

### Step 1：确认 Handler 使用 `render.BaseData()`

```go
func NewToolPage(c *gin.Context) {
    t := render.GetT(c)
    data := render.BaseData(c, gin.H{
        "Title":     t("{tool}.seo.title"),
        "PageClass": "page-{tool}",
        // EnableGA / GAMeasurementID 已自动注入
    })
    render.Render(c, "{tool}.html", data)
}
```

### Step 2：在业务 JS 中添加埋点

参照「4.3 各工具标准埋点示例」，在 `{tool}.js` 中核心操作处添加事件追踪。

### Step 3：新业务验收清单

- [ ] Handler 使用 `render.BaseData()` 渲染
- [ ] 业务 JS 中已引入 `ga-events.js` 提供的追踪函数（base.html 已全局加载）
- [ ] 上传、处理、下载等核心操作已添加 gaTrack* 调用
- [ ] dev 环境 `EnableGA=false`，无 GA script 标签
- [ ] prod 环境 GA 实时报告可看到 page_view 和自定义事件
- [ ] 无硬编码 `G-XXXXXXXXXX`（全局搜索确认）

---

## 七、常见错误

| 错误 | 正确做法 |
|------|---------|
| 子页面 `extraHead` 中写 gtag 初始化 | 删除，由 `base.html` 统一处理 |
| Handler 手动透传 `GAMeasurementID` | 删除，使用 `render.BaseData()` 自动注入 |
| 模板中硬编码 `G-XXXXXXXXXX` | 替换为 `.GAMeasurementID` |
| 业务 JS 中检查 `EnableGA` 再调用 gtag | 不需要，`ga-events.js` 中 `trackEvent` 已有 `typeof gtag` 守卫 |
| `gtag is not defined` 报错 | `ga-events.js` 的 `trackEvent` 会自动静默处理 |

---

## 八、数据流

```
config.json
  ga_measurement_id: "G-XXXXXXXXXX"
  enable_ga: true
        ↓
Config 结构体
        ↓
middleware.GAConfig(cfg)
  c.Set("GAMeasurementID", cfg.GAMeasurementID)
  c.Set("EnableGA",        cfg.EnableGA)
        ↓
render.BaseData(c, gin.H{...})
  自动注入 EnableGA / GAMeasurementID / GoogleAdsConversionID
        ↓
base.html
  EnableGA=false → 不渲染任何 GA script
  EnableGA=true  → 渲染 gtag.js + gtag('config')
        ↓
ga-events.js（全局事件封装）
  trackEvent() → 安全调用 window.gtag，不存在时静默忽略
        ↓
各工具业务 JS
  gaTrackUpload / gaTrackProcessDone / gaTrackDownload ...
        ↓
Google Analytics 4 后台
  page_view / file_upload / process_complete / file_download ...
```
