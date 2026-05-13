---
name: googleads
description: ToolboxNova Google Ads / AdSense 广告位工程规范技能。当用户提到以下任意情况时立即激活：「广告位」「AdSense」「Google Ads」「ad_slot」「新页面加广告」「广告 partial」「广告迁移」「广告配置」。激活后自动判断场景类型（存量迁移 / 新业务接入 / 配置调整），按对应流程输出可直接使用的代码。
type: project
---

# ToolboxNova 广告位工程规范

## 角色定义

你是负责 ToolboxNova 广告位接入与管理的工程助手。项目使用 Google AdSense Auto Ads + `partials/ad_slot.html` 统一 partial 管理广告位。

## 项目约束（开发前必读）

- **广告配置来源**：`config.json` → `infrastructure/config/config.go`
- **中间件注入**：`infrastructure/middleware/ads.go` 的 `AdsConfig()` 自动将配置注入 Gin Context
- **Handler 无需手动透传**：`render.BaseData()` 已自动注入 `AdsEnabled`、`AdsClientID`、`AssetVer` 等字段到模板数据
- **模板渲染**：`partials/ad_slot.html` 统一处理广告位逻辑
- **5 语言**：广告位文案不依赖 i18n（广告由 Google 自动匹配语言）

---

## 一、Config 规范

```go
// infrastructure/config/config.go
type Config struct {
    // ... 其他字段 ...
    AdsClientID string // AdSense Publisher ID，如 "ca-pub-xxxxxxxxxxxxxxxxx"
    EnableAds   bool   // 广告总开关
}
```

配置文件示例：

```json
// config.json（生产环境）
{
  "ads_client_id": "ca-pub-xxxxxxxxxxxxxxxxx",
  "enable_ads": true
}

// config.json（开发环境）
{
  "ads_client_id": "",
  "enable_ads": false
}
```

> **禁止在 Handler、模板、JS 任意位置硬编码 `ca-pub-` 开头的 ID。**

---

## 二、中间件

```go
// infrastructure/middleware/ads.go

func AdsConfig(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Set("AdsClientID", cfg.AdsClientID)
        c.Set("AdsEnabled", cfg.EnableAds)
        c.Next()
    }
}
```

已在 `router.go` 的 `Setup()` 中全局挂载：

```go
r.Use(middleware.AdsConfig(cfg))
```

**所有页面自动获得广告配置**，Handler 无需额外操作。

---

## 三、Handler 规范

**不需要**在 Handler 中手动透传广告字段，`render.BaseData()` 已自动注入：

```go
func {Tool}Page(c *gin.Context) {
    t := render.GetT(c)
    data := render.BaseData(c, gin.H{
        "Title":     t("{tool}.seo.title"),
        "Description": t("{tool}.seo.desc"),
        "PageClass": "page-{tool}",
        // AdsEnabled / AdsClientID / AssetVer 已自动注入
    })
    render.Render(c, "{tool}.html", data)
}
```

---

## 四、前端规范

### 4.1 Partial 调用语法

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

**参数说明**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `SlotID` | string | 是 | 唯一标识，格式 `{tool}-{position}` |
| `AdSlotNum` | string | 否 | AdSense 数字 Slot ID，留空使用 Auto Ads |
| `Size` | string | 是 | 桌面端尺寸：`728x90` / `300x250` / `160x600` |
| `Mobile` | string | 否 | 移动端尺寸，不传则与桌面端一致 |
| `MobileHide` | bool | 否 | `true` = 移动端隐藏（常用于侧边栏） |
| `Enabled` | bool | 是 | **固定写 `.AdsEnabled`** |
| `ClientID` | string | 是 | **固定写 `.AdsClientID`** |

### 4.2 SlotID 命名规范

```
格式：{tool路径末段}-{位置}

位置枚举：
  top       → Hero 区下方横幅（728x90 / 移动端 320x50）
  bottom    → 页面底部横幅（728x90 / 移动端 320x50）
  sidebar   → 侧边栏方形（300x250 / 移动端隐藏）
  mid       → 结果区中部插入（300x250 或 728x90）
  inline-N  → 内容流中第 N 个广告

示例：
  img-compress-top      img-compress-sidebar      img-compress-bottom
  dev-hash-top          dev-hash-sidebar          dev-hash-bottom
  ai-detector-top       ai-detector-sidebar       ai-detector-bottom
```

### 4.3 标准三广告位布局

```html
{{ define "content" }}
<!-- ① 顶部横幅（Hero 区下方）-->
{{- template "partials/ad_slot.html" (dict "SlotID" "{tool}-top" "AdSlotNum" "" "Size" "728x90" "Mobile" "320x50" "Enabled" .AdsEnabled "ClientID" .AdsClientID) }}

<!-- Hero + 工具主体 -->
<section class="hero">...</section>

<section class="tool-main">
  <div class="tool-layout">
    <main class="tool-content">
      <!-- ... 工具核心功能 ... -->

      <!-- ④ 可选：结果区中部广告 -->
      {{- template "partials/ad_slot.html" (dict "SlotID" "{tool}-mid" "AdSlotNum" "" "Size" "300x250" "Mobile" "320x50" "Enabled" .AdsEnabled "ClientID" .AdsClientID) }}
    </main>

    <!-- 侧边栏广告（移动端隐藏）-->
    <aside class="tool-sidebar">
      {{- template "partials/ad_slot.html" (dict "SlotID" "{tool}-sidebar" "AdSlotNum" "" "Size" "300x250" "MobileHide" true "Enabled" .AdsEnabled "ClientID" .AdsClientID) }}
    </aside>
  </div>
</section>

<!-- ② 底部横幅 -->
{{- template "partials/ad_slot.html" (dict "SlotID" "{tool}-bottom" "AdSlotNum" "" "Size" "728x90" "Mobile" "320x50" "Enabled" .AdsEnabled "ClientID" .AdsClientID) }}
{{ end }}
```

---

## 五、场景 A · 存量迁移

### Step 1：扫描硬编码广告位

识别页面中以下模式，均视为需要迁移：

```html
<!-- 模式 1：Google AdSense ins 标签 -->
<ins class="adsbygoogle" data-ad-client="ca-pub-..."></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>

<!-- 模式 2：广告占位 div -->
<div class="ad-slot" data-slot-id="xxx"></div>
<div class="advertisement-top">...</div>

<!-- 模式 3：含 ad / adsense / advertisement 关键词的容器 -->
<div class="ad-wrap-top">...</div>
```

### Step 2：输出 diff

```diff
- <ins class="adsbygoogle" data-ad-client="ca-pub-12345678"></ins>
+ {{- template "partials/ad_slot.html" (dict "SlotID" "img-compress-top" "Size" "728x90" "Mobile" "320x50" "Enabled" .AdsEnabled "ClientID" .AdsClientID) }}
```

### Step 3：存量迁移验收清单

- [ ] 所有硬编码 `ca-pub-` ID 已从模板中删除
- [ ] SlotID 命名符合 `{tool}-{position}` 规范，无重复
- [ ] 侧边栏广告已设置 `MobileHide: true`
- [ ] 移动端横幅广告已设置 `Mobile: "320x50"`
- [ ] `.AdsClientID` 和 `.AdsEnabled` 来自 `render.BaseData()` 自动注入
- [ ] dev 环境 `EnableAds=false`，广告位不渲染真实广告

---

## 六、场景 B · 新业务接入

### Step 1：确认 Handler 使用 `render.BaseData()`

```go
func NewToolPage(c *gin.Context) {
    t := render.GetT(c)
    data := render.BaseData(c, gin.H{
        "Title":     t("{tool}.seo.title"),
        "PageClass": "page-{tool}",
        // AdsEnabled / AdsClientID 已自动注入，无需手动添加
    })
    render.Render(c, "{tool}.html", data)
}
```

### Step 2：在模板中插入广告位

参照「4.3 标准三广告位布局」在 `content` block 中插入。

### Step 3：新业务验收清单

- [ ] Handler 使用 `render.BaseData()` 渲染（自动获得广告配置）
- [ ] 模板中 `ClientID` 使用 `.AdsClientID`（禁止硬编码）
- [ ] 模板中 `Enabled` 使用 `.AdsEnabled`（禁止硬编码）
- [ ] SlotID 遵循 `{tool}-{position}` 规范，全局无重复
- [ ] 侧边栏广告设置了 `MobileHide: true`
- [ ] 移动端横幅广告设置了 `Mobile: "320x50"`
- [ ] dev 环境广告位区域不渲染真实广告

---

## 七、常见错误

| 错误 | 正确做法 |
|------|---------|
| 模板中出现 `ca-pub-` 硬编码 | 替换为 `.AdsClientID` |
| Handler 手动透传 `AdsClientID` | 删除，使用 `render.BaseData()` 自动注入 |
| `dict` 不带括号 | 必须使用 `(dict "K" v)` 语法 |
| 新路由未获得广告配置 | 确认路由在 `middleware.AdsConfig(cfg)` 之后注册（全局挂载已覆盖所有路由） |
| SlotID 与已有页面重复 | 确保工具名前缀唯一 |

---

## 八、数据流

```
config.json
  ads_client_id: "ca-pub-xxx"
  enable_ads: true
        ↓
Config 结构体
        ↓
middleware.AdsConfig(cfg)
  c.Set("AdsClientID", cfg.AdsClientID)
  c.Set("AdsEnabled",  cfg.EnableAds)
        ↓
render.BaseData(c, gin.H{...})
  自动注入 AdsEnabled / AdsClientID / AssetVer
        ↓
HTML 模板
  {{- template "partials/ad_slot.html" (dict ... "ClientID" .AdsClientID "Enabled" .AdsEnabled) }}
        ↓
ad_slot.html partial
  Enabled=false → 渲染灰色占位块
  Enabled=true  → 渲染广告容器
```
