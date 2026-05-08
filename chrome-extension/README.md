# ToolBoxNova Chrome Extension

ToolBoxNova 的 Chrome 浏览器扩展，提供 JSON 工具、密码生成器、AI 检测、图片工具、颜色工具等，支持离线使用。

## 目录结构

```
chrome-extension/
├── manifest.json           # MV3 扩展配置
├── background.js           # Service Worker（右键菜单、API 代理）
├── content.js              # Content Script（接收右键菜单数据）
├── _locales/               # Chrome i18n（en/zh/ja/ko/spa）
│   ├── en/messages.json
│   ├── zh/messages.json
│   └── ...
├── popup/                  # 点击图标弹出的快捷面板（8 个工具入口）
│   ├── popup.html
│   └── popup.js
├── sidepanel/              # 侧边栏完整工具（Chrome 114+）
│   ├── sidepanel.html
│   └── sidepanel.js
├── pages/                  # 各工具独立页面
│   ├── json.html
│   ├── password.html
│   └── ...
├── scripts/
│   ├── build.sh            # 构建（同步主仓库资源 + 打包 zip）
│   └── deploy.sh           # 一键发布到 Chrome Web Store
└── static/                 # 开发时的软链接/副本，构建时自动同步
```

## 开发流程

### 1. 本地开发

```bash
# 从项目根目录运行构建（同步最新 CSS/JS/i18n）
sh chrome-extension/scripts/build.sh

# 在 Chrome 中加载未打包的扩展：
# 1. 打开 chrome://extensions/
# 2. 开启「开发者模式」
# 3. 点击「加载已解压的扩展程序」
# 4. 选择 dist/chrome-extension/ 目录
```

### 2. 修改代码后的工作流

```
修改主仓库 CSS/JS → sh scripts/build.sh → 刷新扩展（chrome://extensions/ 页面点击刷新按钮）
修改扩展专属代码（popup/sidepanel/HTML）→ 刷新扩展
```

### 3. 持续更新

**build.sh 会自动同步以下资源**（每次构建都是最新的）：

| 资源 | 来源 | 复用率 |
|------|------|--------|
| CSS | `frontend/static/css/` | 100% 零改动 |
| A 类 JS | `frontend/static/js/` | 100% 零改动 |
| i18n JSON | `common/i18n/` | 100% 零改动 |
| 数据集 | `frontend/static/datasets/` | 100% 零改动 |

主仓库更新了 CSS/JS 后，只需 `sh scripts/build.sh` 重新同步即可。

### 4. 发布新版本

```bash
# 1. 更新版本号
# 编辑 manifest.json 中的 "version": "1.0.0" → "1.0.1"

# 2. 一键部署（构建 + 上传 + 发布）
sh chrome-extension/scripts/deploy.sh

# 或发布到所有用户（默认只发布给 Trusted Testers）
sh chrome-extension/scripts/deploy.sh --public
```

## 发布配置（首次设置）

### 1. 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目，记下 Project ID
3. 启用 **Chrome Web Store API**
4. 创建 **OAuth 2.0 凭证**（桌面应用类型），获取 `client_id` 和 `client_secret`

### 2. 获取 Refresh Token

```bash
# 1. 在浏览器中打开以下 URL（替换 YOUR_CLIENT_ID）
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=https://www.googleapis.com/auth/chromewebstore

# 2. 授权后复制 code 参数

# 3. 用 code 换取 refresh_token
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=YOUR_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

### 3. 获取 Extension ID

1. 先手动打包 zip 并上传到 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 上传后会获得一个 Extension ID（如 `abcdefghijklmnopqrstuvwxyz`）

### 4. 设置环境变量

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
export CW_CLIENT_ID="your_client_id"
export CW_CLIENT_SECRET="your_client_secret"
export CW_REFRESH_TOKEN="your_refresh_token"
export CW_APP_ID="your_extension_id"
```

设置完成后，`sh scripts/deploy.sh` 即可一键发布。

## 工具分类

### A 类 — 纯前端（离线可用）

JSON 工具（40+）、密码生成器、密码强度检测、图片压缩/缩放/Metadata、颜色工具、QR 码、Base 转换、大小写转换、正则测试、Markdown 预览、时间戳转换、浏览器指纹

### B 类 — 需要调用 API（通过 toolboxnova.com 中转）

AI 内容检测、AI 人性化、AI 竞品分析、AI 抄袭检测、隐私账号检查

### C 类 — 不适合放入插件

SMS 接码、临时邮箱、匿名代理（强依赖后端持久化）

## 技术栈

- Manifest V3（Chrome 最新标准）
- 原生 JavaScript（与主网站一致，无需 React/Vue）
- CSS 直接复用主仓库
- Chrome Side Panel API（Chrome 114+）
- Chrome Context Menus API（右键菜单集成）
