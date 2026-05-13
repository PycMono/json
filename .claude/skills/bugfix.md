---
name: bugfix
description: ToolboxNova Bug 修复规范技能。当用户提到以下任意情况时立即激活：「修 bug」「修复」「bugfix」「有问题」「出错了」「不工作」「报错」「修复需求」「needs/bugfix」「图片格式不支持」「文件大小限制」「上传失败」「显示不正确」。激活后自动执行根因分析 → 最小修复 → 验证的标准流程。
type: project
---

# ToolboxNova Bug 修复规范

## 角色定义

你是一位 ToolboxNova Bug 修复工程师。收到 bug 报告后，你执行**根因分析 → 最小修复 → 验证**的标准流程，每次只改与 bug 直接相关的代码，不连带重构。

## 项目约束（开发前必读）

- **最小改动**：只修复 bug，不重构周边代码
- **双端检查**：前端 bug 可能源于后端，后端 bug 可能表现在前端
- **5 语言**：修复文案时必须同时检查 5 种语言文件
- **格式一致性**：UI 声明的支持能力必须与引擎实际能力完全一致
- **模块路径**：`PycMono/github/toolskit`

---

## 一、Bug 修复标准流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 1. 理解报告 │ → │ 2. 复现定位 │ → │ 3. 根因分析 │ → │ 4. 最小修复 │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
                                                       ┌─────────────┐
                                                       │ 5. 验证修复 │
                                                       └─────────────┘
```

---

## 二、步骤详解

### 2.1 理解报告

读取 `needs/bugfix_v*.md` 或用户描述，提取关键信息：

```yaml
现象:        {用户看到什么}
预期:        {用户期望什么}
实际:        {实际发生什么}
复现步骤:     {如何触发}
影响范围:     {哪些页面/功能受影响}
环境:        {浏览器/语言/是否登录}
截图/日志:    {辅助信息}
```

### 2.2 复现定位

按以下顺序排查：

| 顺序 | 检查点 | 方法 |
|------|--------|------|
| 1 | 前端表现 | 查看模板、JS、浏览器 DevTools Console/Network |
| 2 | 后端表现 | 查看 Handler、Service、日志输出 |
| 3 | 数据层 | 查看数据库/Redis 数据是否符合预期 |
| 4 | 配置层 | 查看 `config.json` 相关配置 |
| 5 | 边界条件 | 空输入、超大输入、特殊字符、并发请求 |

### 2.3 根因分析

写出根因结论，格式：

```
根因：[具体原因，定位到文件和行号]
影响：[受影响的代码路径]
```

**常见根因分类**：

| 类型 | 示例 | 典型修复 |
|------|------|---------|
| **声明与实际不一致** | UI 写支持 GIF，但 JS 只处理 JPG/PNG | 统一 UI 文案和引擎校验逻辑 |
| **常量未同步** | UI 写最大 10MB，JS 写 100MB | 统一定义常量，两端引用同一值 |
| **边界值遗漏** | 空数组、0 长度、nil pointer | 添加空值检查 |
| **i18n key 缺失** | 5 语言文件未同步更新 | 补齐所有语言文件 |
| **并发问题** | map 并发读写、竞态条件 | 加锁或改用线程安全结构 |
| **类型转换错误** | string → int 失败、JSON 解析错误 | 添加错误处理和默认值 |
| **模板变量缺失** | Handler 未传入模板需要的字段 | 在 Handler 的 BaseData 中补充 |

### 2.4 最小修复

**原则**：
- 只改与 bug 直接相关的代码
- 不重构不相关的函数
- 不删除「看似没用」的代码
- 不改变原有代码风格

**修复范围 checklist**：
- [ ] 修复了根因代码
- [ ] 如果涉及 UI 文案，5 语言文件同步更新
- [ ] 如果涉及常量（如文件大小限制），两端（UI + 引擎）同步更新
- [ ] 如果涉及格式支持，上传校验和输出处理同步更新
- [ ] 没有引入新的变量或函数（除非必要）
- [ ] 没有删除未使用的代码（除非它本身就是 bug 原因）

### 2.5 验证修复

**代码验证**：
- [ ] `go build ./cmd/server` 编译通过
- [ ] `go test ./...` 测试通过（或相关包测试通过）
- [ ] `go vet ./...` 无警告

**功能验证**：
- [ ] 按照复现步骤操作，bug 不再出现
- [ ] 正常功能未被破坏（回归测试）
- [ ] 5 语言切换后正常
- [ ] 移动端正常

---

## 三、典型 Bug 场景速查

### 场景 A：UI 声明与实际能力不一致

**示例**：页面上写「支持 GIF、BMP、TIFF」，但引擎只处理 JPG/PNG/WebP。

**根因**：前端文案和引擎校验逻辑未同步。

**修复**：
1. 确定引擎**真实**支持的格式
2. 更新 JS 引擎的格式校验白名单
3. 更新 i18n 文案（5 语言）
4. 更新 `accept` 属性

```javascript
// 统一格式常量
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SUPPORTED_EXT = 'JPG, PNG, WebP';

function validateFile(file) {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    showError(i18n.error.unsupported_format.replace('{formats}', SUPPORTED_EXT));
    return false;
  }
}
```

### 场景 B：文件大小限制不一致

**示例**：UI 写最大 10MB，后端/JS 写 100MB。

**根因**：常量分散在多处，未统一定义。

**修复**：
1. 确定业务需要的真实限制
2. 将常量提取到单一位置

```javascript
// img-{tool}.js
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 20;

// i18n 文案同步
"img.{tool}.upload.hint": "Supports JPG, PNG, WebP. Max 100MB per file, up to 20 files."
```

### 场景 C：i18n 文案缺失

**示例**：切换语言后某个按钮显示 `common.btn.submit`（key 裸露）。

**根因**：5 语言文件未同步，某语言缺少该 key。

**修复**：
1. 在 `common/i18n/en/{file}.json` 中添加
2. 同步到 `zh/ja/ko/spa` 对应文件
3. 确认 key 拼写与模板中 `{{ call .T "key" }}` 一致

### 场景 D：模板变量缺失

**示例**：页面渲染报错 `template: executing "xxx" at <.EnableGA>: can't evaluate field EnableGA`。

**根因**：Handler 使用 `gin.H{}` 直接渲染，未通过 `render.BaseData()`。

**修复**：

```go
// 错误
c.HTML(200, "xxx.html", gin.H{"Title": "..."})

// 正确
data := render.BaseData(c, gin.H{"Title": "..."})
render.Render(c, "xxx.html", data)
```

### 场景 E：内存泄漏

**示例**：多次上传/清空后浏览器内存持续增长。

**根因**：`URL.createObjectURL()` 产生的 blob URL 未释放。

**修复**：

```javascript
const state = {
  objectURLs: [], // 追踪所有创建的 URL
};

function processFile(file) {
  const url = URL.createObjectURL(file);
  state.objectURLs.push(url);
  return url;
}

function clearAll() {
  state.objectURLs.forEach(URL.revokeObjectURL);
  state.objectURLs = [];
  // 清空 DOM + 重置状态
}
```

---

## 四、Bugfix 需求文件规范

`needs/bugfix_v{n}.md` 标准格式：

```markdown
# Bugfix v{n}

## 现象
{用户看到的问题}

## 复现步骤
1. {步骤 1}
2. {步骤 2}
3. {步骤 3}

## 预期结果
{应该发生什么}

## 实际结果
{实际发生什么}

## 截图
{如有}

## 根因分析
{分析结论}

## 修复方案
{具体修改点}

## 验证方式
{如何确认修复成功}
```

---

## 五、不要做的事情

- **不要连带重构** — 只修 bug，重构另开 PR
- **不要删除「看似没用」的代码** — 可能是其他路径的依赖
- **不要只修一种语言** — i18n 必须 5 语言同步
- **不要只修前端或只修后端** — 两端声明必须一致
- **不要忽略边界测试** — 修复后必须验证空输入、超大输入等边界
- **不要不验证就提交** — 必须本地复现确认修复成功
