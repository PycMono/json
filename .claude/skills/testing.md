---
name: testing
description: ToolboxNova 测试工程规范技能。当用户提到以下任意情况时立即激活：「写测试」「单元测试」「测试用例」「go test」「 handler 测试」「怎么测」「测试覆盖」「mock」「stub」「表驱动测试」。激活后根据测试目标（Go 后端 / HTTP Handler / 前端功能）输出可直接使用的测试代码和测试策略。
type: project
---

# ToolboxNova 测试工程规范

## 角色定义

你是一位 ToolboxNova 测试工程师。项目使用 Go 标准 `testing` 包，无第三方测试框架依赖。测试策略以单元测试为主，HTTP Handler 测试为辅，前端功能通过手动测试清单验证。

## 项目约束（开发前必读）

- **Go 版本**：1.25
- **测试框架**：标准 `testing` 包，无 testify/ginkgo 等第三方依赖
- **测试文件命名**：`*_test.go`，与被测文件同包或 `_test` 后缀包
- **模块路径**：`PycMono/github/toolskit`
- **运行命令**：`go test ./...`（全部）或 `go test ./package/path -run TestFunc`（单个）
- **前端**：无自动化测试框架，使用手动测试清单

---

## 一、Go 单元测试标准模式

### 1.1 表驱动测试（首选）

```go
package json

import "testing"

func TestIsBlockedHost(t *testing.T) {
    cases := []struct {
        host    string
        blocked bool
    }{
        {"localhost", true},
        {"127.0.0.1", true},
        {"api.github.com", false},
        {"example.com", false},
    }

    for _, c := range cases {
        got := isBlockedHost(c.host)
        if got != c.blocked {
            t.Errorf("host=%s: want blocked=%v, got=%v", c.host, c.blocked, got)
        }
    }
}
```

### 1.2 错误处理测试

```go
func TestSimplifyError(t *testing.T) {
    cases := []struct {
        input    string
        expected string
    }{
        {"dial tcp: i/o timeout", "connection timeout"},
        {"no such host", "host not found"},
        {"unknown error", "network error"},
    }

    for _, c := range cases {
        got := simplifyError(c.input)
        if got != c.expected {
            t.Errorf("input=%s: want %s, got %s", c.input, c.expected, got)
        }
    }
}
```

### 1.3 浮点数/近似值测试

```go
func TestCompressRatio(t *testing.T) {
    got := calcCompressRatio(1000, 400)
    want := 60.0
    epsilon := 0.01
    if diff := got - want; diff < -epsilon || diff > epsilon {
        t.Errorf("ratio=%.2f, want %.2f (±%.2f)", got, want, epsilon)
    }
}
```

---

## 二、Stub / Mock 模式

项目使用**手动 Stub** 实现仓储接口，不引入 mockgen 等工具。

```go
package sms

import (
    "context"
    "testing"
    "PycMono/github/toolskit/domain/entity"
)

// ── Stub 仓储 ──

type stubCountryRepo struct {
    count int64
    all   []*entity.SmsCountry
}

func (r *stubCountryRepo) Count(ctx context.Context) (int64, error) {
    return r.count, nil
}
func (r *stubCountryRepo) FindAll(ctx context.Context) ([]*entity.SmsCountry, error) {
    return r.all, nil
}
func (r *stubCountryRepo) FindByName(ctx context.Context, name string) (*entity.SmsCountry, error) {
    return nil, nil
}
func (r *stubCountryRepo) Upsert(ctx context.Context, c *entity.SmsCountry) error {
    return nil
}
func (r *stubCountryRepo) BatchUpsert(ctx context.Context, cs []*entity.SmsCountry) error {
    return nil
}

// ── 测试 ──

func TestService_Reconcile(t *testing.T) {
    svc := NewService(&stubCountryRepo{count: 5, all: []*entity.SmsCountry{
        {ID: "US", Name: "United States"},
    }}, ...)

    // 执行
    err := svc.Reconcile(context.Background())
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // 断言
    // ...
}
```

**Stub 命名规范**：`stub{InterfaceName}`，只实现测试需要的方法，其余返回零值。

---

## 三、HTTP Handler 测试

### 3.1 使用 Gin 的测试模式

```go
package image

import (
    "net/http"
    "net/http/httptest"
    "testing"

    "PycMono/github/toolskit/infrastructure/controller/http/render"
    "github.com/gin-gonic/gin"
)

func TestImgCompressPage(t *testing.T) {
    gin.SetMode(gin.TestMode)
    router := gin.New()
    router.GET("/img/compress", ImgCompressPage)

    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/img/compress", nil)
    router.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("status=%d, want %d", w.Code, http.StatusOK)
    }
    if !bytes.Contains(w.Body.Bytes(), []byte("compress")) {
        t.Error("response body missing expected content")
    }
}
```

### 3.2 测试 i18n 中间件注入

```go
func TestPage_WithLangParam(t *testing.T) {
    gin.SetMode(gin.TestMode)
    router := gin.New()
    router.Use(middleware.I18nMiddleware())
    router.GET("/test", TestPage)

    cases := []struct {
        lang     string
        expected string
    }{
        {"?lang=zh", "中文标题"},
        {"?lang=en", "English Title"},
        {"?lang=ja", "日本語タイトル"},
    }

    for _, c := range cases {
        w := httptest.NewRecorder()
        req, _ := http.NewRequest("GET", "/test"+c.lang, nil)
        router.ServeHTTP(w, req)

        if w.Code != http.StatusOK {
            t.Errorf("lang=%s: status=%d", c.lang, w.Code)
        }
    }
}
```

---

## 四、文件处理 / IO 测试

### 4.1 使用 t.TempDir()

```go
func TestProcessFile(t *testing.T) {
    dir := t.TempDir()
    path := filepath.Join(dir, "test.png")
    if err := os.WriteFile(path, []byte("fake png data"), 0o644); err != nil {
        t.Fatalf("write test file: %v", err)
    }

    result, err := processFile(path)
    if err != nil {
        t.Fatalf("processFile: %v", err)
    }
    if result == nil {
        t.Error("expected non-nil result")
    }
}
```

### 4.2 测试 i18n 加载

```go
func setupLocales(t *testing.T) string {
    t.Helper()
    dir := t.TempDir()
    content := map[string]string{
        "en.json": `{"site.title": "ToolsKit"}`,
        "zh.json": `{"site.title": "工具箱"}`,
    }
    for name, data := range content {
        if err := os.WriteFile(filepath.Join(dir, name), []byte(data), 0o644); err != nil {
            t.Fatalf("write %s: %v", name, err)
        }
    }
    return dir
}
```

---

## 五、新工具测试清单

开发新工具时，至少编写以下测试：

### 5.1 后端测试（必须）

- [ ] **核心算法/转换逻辑测试**：表驱动测试覆盖正常输入、边界值、错误输入
- [ ] **Handler 基础测试**：HTTP 200 状态码、关键内容存在
- [ ] **i18n 语言切换测试**：`?lang=zh/en/ja/ko/spa` 各语言正常渲染
- [ ] **限流测试**（如有后端 API）：快速请求返回 429

### 5.2 前端手动测试清单

- [ ] **功能路径**：上传/输入 → 处理 → 结果展示 → 下载/复制
- [ ] **空状态**：无输入时的提示文案正确
- [ ] **错误状态**：超大文件、不支持格式、网络错误时的 Toast 提示
- [ ] **5 语言**：切换语言后所有文案正确，无 i18n key 裸露
- [ ] **暗色模式**：`data-theme="dark"` 下 UI 正常
- [ ] **移动端**：480px 宽度下布局正常，触控区域 ≥ 44px
- [ ] **广告容错**：`AdsEnabled=false` 时显示占位块不报错
- [ ] **内存泄漏**：文件类工具多次上传/清空后 DevTools Memory 无增长
- [ ] **复制功能**：HTTPS 和 localhost 均可正常复制到剪贴板
- [ ] **下载功能**：文件名正确、格式正确、ZIP 内容完整

---

## 六、运行测试

```bash
# 全部测试
go test ./...

# 单个包
go test ./common/i18n/

# 单个函数
go test ./infrastructure/controller/http/json/ -run TestIsBlockedHost

# 带详细输出
go test ./... -v

# 带覆盖率
go test ./... -cover

# 指定包覆盖率详情
go test ./common/i18n/ -coverprofile=coverage.out && go tool cover -html=coverage.out
```

---

## 七、不要做的事情

- **不要引入 testify、gomock 等第三方测试库** — 保持纯标准库
- **不要在测试中依赖外部网络** — 使用 stub/mock 隔离外部服务
- **不要忽略 `t.Helper()`** — 辅助函数必须标记，错误栈更精确
- **不要在测试中写死文件路径** — 使用 `t.TempDir()` 创建临时目录
- **不要只测 happy path** — 必须覆盖错误边界、空输入、超大输入
- **不要并行修改全局状态** — `gin.SetMode()` 等全局设置用 `t.Cleanup()` 恢复
