---
name: ai-tools
description: ToolboxNova AI 工具开发技能。当用户提到以下任意情况时立即激活：「AI 检测器」「AI detector」「人性化」「humanize」「AI 重写」「AI 竞争」「AI 图片生成」「AI 工具」「大模型」「SSE 流式」「prompt 模板」「provider」「OpenAI」「Claude」「DeepSeek」「Gemini」「Doubao」「token 计费」。激活后自动判断 AI 工具类型，输出可直接落地的控制器、模板、JS、CSS、prompt 模板和 i18n 配置。
type: project
---

# ToolboxNova AI 工具开发规范

## 角色定义

你是一位熟悉 ToolboxNova AI 服务架构的 AI 应用工程师。你理解大模型 Provider 工厂模式、Prompt 模板系统、SSE 流式输出、前端实时渲染和 Token 计费体系。

当前项目已有的 AI 工具：检测器(`ai/detector`)、人性化(`ai/humanize` / `ai/humanizer`)、竞争分析(`ai/compete`)、文章重写(`ai/article-rewriter`)、段落重写(`ai/paragraph-rewriter`)、句子重写(`ai/sentence-rewriter`)、论文辅助(`ai/essay`)、学术检测(`ai/detector-academic`)、AI 图片生成(`ai/image`) 等。

## 项目约束（开发前必读）

- **后端**：Go 1.25 + Gin，AI 服务在 `infrastructure/serviceimpl/ai/`
- **前端**：Go html/template + 原生 JavaScript + Tailwind CSS
- **5 语言**：zh / en / ja / ko / spa
- **Provider 工厂**：OpenAI / DeepSeek / Gemini / Doubao / Claude
- **Prompt 模板**：`.md` 文件在 `common/prompts/`，Go loader 加载
- **流式输出**：SSE (Server-Sent Events)，前端打字机效果
- **Token 计费**：通过 `application/service/token` 扣费
- **免费额度**：通常 15000 字符/字

---

## 一、AI 工具类型判断

| 类型 | 特征 | 示例 |
|------|------|------|
| **A. 文本分析** | 输入文本 → AI 分析 → 结构化结果 | detector, plagiarism |
| **B. 文本改写** | 输入文本 → AI 改写 → 输出新文本 | humanize, article-rewriter, sentence-rewriter |
| **C. 文本生成** | 输入 prompt → AI 生成 → 输出新文本 | essay, for-college, for-professors |
| **D. 对比/竞争** | 多输入 → AI 对比 → 结构化报告 | compete |
| **E. 图片生成** | 输入 prompt → AI 生成图片 → 展示/下载 | image |

---

## 二、AI Provider 架构

### 2.1 Provider 接口

```go
// infrastructure/serviceimpl/ai/interface.go
type Provider interface {
    Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error)
    ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error)
    GenerateImage(ctx context.Context, req ImageRequest) (*ImageResponse, error)
    GetProviderName() string
    IsAvailable() bool
}
```

### 2.2 Provider 工厂

```go
// infrastructure/serviceimpl/ai/mgr.go
func GetProviderForTask(task string) Provider {
    switch task {
    case "detect":     return GetProvider("deepseek") // 或按配置路由
    case "humanize":   return GetProvider("claude")
    case "compete":    return GetProvider("openai")
    case "image":      return GetProvider("gemini")
    default:           return GetProvider("openai")
    }
}
```

**任务路由配置**在 `config.json` 中：
```json
{
  "ai": {
    "task_routing": {
      "detect": "deepseek",
      "humanize": "claude",
      "compete": "openai",
      "image": "gemini"
    }
  }
}
```

### 2.3 新增 Provider 步骤

1. 在 `infrastructure/serviceimpl/ai/` 创建 `{provider}.go`
2. 实现 `Provider` 接口的 5 个方法
3. 在 `mgr.go` 中注册：`RegisterProvider("{name}", &{Provider}Impl{})`
4. 在 `config.json` 中添加 API Key 配置

---

## 三、Prompt 模板系统

### 3.1 模板文件位置

```
common/prompts/
├── detect.md          # AI 检测 prompt
├── humanize.md        # 人性化 prompt
├── compete.md         # 竞争分析 prompt
├── essay.md           # 论文辅助 prompt
├── img-gen.md         # 图片生成 prompt
└── mgr.go             # Prompt loader
```

### 3.2 Prompt 模板格式

```markdown
# System
你是 {role}。{task description}

## 约束
- {constraint 1}
- {constraint 2}

## 输出格式
```json
{
  "score": 0-100,
  "verdict": "human|mixed|ai",
  "confidence": 0-100,
  "analysis": { ... }
}
```

## 用户输入
{{ .Input }}
```

### 3.3 Go 代码加载 Prompt

```go
// common/prompts/mgr.go
package prompts

import (
    "embed"
    "text/template"
)

//go:embed *.md
var promptFS embed.FS

func LoadPrompt(name string) (string, error) {
    data, err := promptFS.ReadFile(name + ".md")
    if err != nil { return "", err }
    return string(data), nil
}

func RenderPrompt(name string, data map[string]interface{}) (string, error) {
    tmpl, err := template.New(name).Parse(prompt)
    // ... render with data
}
```

### 3.4 新增 Prompt 模板步骤

1. 在 `common/prompts/` 创建 `{task}.md`
2. 使用 Go embed 加载（已存在 `//go:embed *.md`）
3. 在控制器/服务中调用 `prompts.RenderPrompt("{task}", vars)`
4. 将渲染后的 prompt 作为 `ChatRequest.Messages` 的 system message

---

## 四、SSE 流式输出

### 4.1 后端 SSE 控制器

```go
func AIStreamHandler(c *gin.Context) {
    // 设置 SSE headers
    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")

    provider := ai.GetProviderForTask("{task}")
    req := ai.ChatRequest{
        Messages: []ai.Message{
            {Role: "system", Content: systemPrompt},
            {Role: "user", Content: userInput},
        },
    }

    stream, err := provider.ChatStream(c.Request.Context(), req)
    if err != nil {
        c.SSEvent("error", err.Error())
        return
    }

    for chunk := range stream {
        if chunk.Error != nil {
            c.SSEvent("error", chunk.Error.Error())
            return
        }
        c.SSEvent("message", chunk.Content)
    }

    c.SSEvent("done", "")
}
```

### 4.2 前端 SSE 接收

```javascript
function streamAIOutput(input, onChunk, onDone, onError) {
  const evtSource = new EventSource(`/api/ai/{task}/stream?input=${encodeURIComponent(input)}`);

  evtSource.addEventListener('message', (e) => {
    onChunk(e.data);
  });

  evtSource.addEventListener('done', () => {
    evtSource.close();
    onDone();
  });

  evtSource.addEventListener('error', (e) => {
    evtSource.close();
    onError(e.data);
  });

  return () => evtSource.close(); // cleanup function
}
```

### 4.3 打字机效果

```javascript
function typewriterEffect(element, text, speed = 30) {
  let i = 0;
  element.textContent = '';
  const timer = setInterval(() => {
    element.textContent += text.charAt(i);
    i++;
    if (i >= text.length) clearInterval(timer);
  }, speed);
  return () => clearInterval(timer);
}
```

---

## 五、前端 UI 标准模式

### 5.1 文本分析类（Detector 模式）

```
┌─────────────────────────────────────┐
│  Tab: [Text] [File] [URL]           │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ 输入文本...                 │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│  1,234 / 15,000 words               │
│  [Detect]                           │
├─────────────────────────────────────┤
│  Loading... / Result Gauge          │
│  Score: 78% AI                      │
│  Sentence-level analysis            │
│  [Humanize It]                      │
└─────────────────────────────────────┘
```

### 5.2 文本改写类（Humanize 模式）

```
┌─────────────────────────────────────┐
│  Input                              │
│  ┌─────────────────────────────┐    │
│  │ 原始文本...                 │    │
│  └─────────────────────────────┘    │
│  Mode: [Basic] [Standard] [Aggressive]
│  Tone: [Academic] [Casual] [Business]
│  [Humanize]                         │
├─────────────────────────────────────┤
│  Output (streaming)                 │
│  ┌─────────────────────────────┐    │
│  │ 改写后的文本... (打字机)    │    │
│  └─────────────────────────────┘    │
│  [Copy] [Download] [Compare]        │
└─────────────────────────────────────┘
```

### 5.3 JS 状态管理标准

```javascript
const AIState = {
  inputText: '',
  inputMode: 'text', // text | file | url
  isProcessing: false,
  result: null,
  streamText: '',
  settings: {
    mode: 'balanced',   // basic | standard | aggressive | academic | creative | business
    tone: 'standard',
    language: 'auto',
  },
  history: [],
};
```

---

## 六、Token 计费集成

### 6.1 扣费流程

```go
func AIHandler(c *gin.Context) {
    user := auth.GetUser(c)
    input := c.PostForm("text")

    // 1. 检查额度
    balance, err := tokenService.GetBalance(user.ID)
    if err != nil || balance <= 0 {
        c.JSON(402, gin.H{"error": "insufficient tokens"})
        return
    }

    // 2. 估算消耗（或按字符数）
    cost := estimateCost(input)

    // 3. 预扣费
    if err := tokenService.Deduct(user.ID, cost, "ai_{task}"); err != nil {
        c.JSON(402, gin.H{"error": "insufficient tokens"})
        return
    }

    // 4. 调用 AI
    result, err := aiService.Process(input)
    if err != nil {
        // 5. 失败回滚
        tokenService.Refund(user.ID, cost, "ai_{task}_failed")
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(200, result)
}
```

### 6.2 免费额度展示

前端必须显示剩余额度：
```javascript
function updateTokenDisplay(used, limit) {
  const remaining = limit - used;
  const bar = document.getElementById('tokenBar');
  bar.style.width = `${(used / limit) * 100}%`;
  document.getElementById('tokenText').textContent = `${remaining} / ${limit} free`;
}
```

---

## 七、后端控制器标准

```go
package ai

import (
    "PycMono/github/toolskit/common/faq"
    "PycMono/github/toolskit/infrastructure/controller/http/render"
    "github.com/gin-gonic/gin"
)

// {Tool}Page renders the AI {tool} page
func {Tool}Page(c *gin.Context) {
    t := render.GetT(c)
    lang := render.GetLang(c)
    data := render.BaseData(c, gin.H{
        "Title":         t("ailab.{tool}.seo.title"),
        "Description":   t("ailab.{tool}.seo.desc"),
        "Keywords":      t("ailab.{tool}.seo.keywords"),
        "PageClass":     "page-ai-{tool}",
        "ToolName":      "ai-{tool}",
        "Lang":          lang,
        "FAQ":           faq.{Tool}FAQs,
        "HreflangEN":    "https://ycjson.top/ai/{tool}?lang=en",
        "HreflangZH":    "https://ycjson.top/ai/{tool}?lang=zh",
        "HreflangJA":    "https://ycjson.top/ai/{tool}?lang=ja",
        "HreflangKO":    "https://ycjson.top/ai/{tool}?lang=ko",
        "HreflangES":    "https://ycjson.top/ai/{tool}?lang=es",
        "FreeWordLimit": 15000,
    })
    render.Render(c, "ailab/{tool}.html", data)
}
```

---

## 八、i18n Key 命名规范

AI 工具统一使用 `ailab.{tool}.{area}.{element}` 格式：

```json
{
  "ailab.{tool}.seo.title": "...",
  "ailab.{tool}.seo.desc": "...",
  "ailab.{tool}.hero.title": "...",
  "ailab.{tool}.input.placeholder": "Paste your text here...",
  "ailab.{tool}.input.tab.text": "Text",
  "ailab.{tool}.input.tab.file": "File",
  "ailab.{tool}.input.tab.url": "URL",
  "ailab.{tool}.btn.detect": "Detect",
  "ailab.{tool}.btn.humanize": "Humanize",
  "ailab.{tool}.btn.copy": "Copy",
  "ailab.{tool}.mode.basic": "Basic",
  "ailab.{tool}.mode.standard": "Standard",
  "ailab.{tool}.mode.aggressive": "Aggressive",
  "ailab.{tool}.result.loading": "Analyzing...",
  "ailab.{tool}.result.empty": "Enter text to get started",
  "ailab.{tool}.error.too_long": "Text exceeds 15,000 character limit",
  "ailab.{tool}.error.too_short": "Please enter at least 50 characters",
  "ailab.{tool}.token.remaining": "{remaining} / {limit} free words left"
}
```

---

## 九、路由注册

```go
// infrastructure/controller/http/router.go
aiGroup := r.Group("/ai")
{
    aiGroup.GET("/{tool}", ai.{Tool}Page)
    aiGroup.POST("/api/{task}", ai.{Tool}API)
    aiGroup.GET("/api/{task}/stream", ai.{Tool}StreamAPI)
}
```

---

## 十、不要做的事情

- **不要在前端暴露 API Key** — 所有 provider 调用必须经过后端
- **不要缓存 AI 结果到公共 CDN** — 结果可能包含用户隐私数据
- **不要无限流式输出** — 设置最大 token / 字符上限，防止滥用
- **不要在 SSE 连接断开时继续扣费** — 连接中断应停止计费和生成
- **不要忽略错误回滚** — AI 调用失败必须回滚预扣的 token
- **不要把 prompt 模板硬编码在 Go 代码中** — 必须使用 `common/prompts/*.md`
- **不要忽略流式输出的安全转义** — 前端接收 SSE 数据时要防 XSS
