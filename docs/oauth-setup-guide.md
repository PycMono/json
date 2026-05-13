# OAuth 配置指南

本文档详细说明如何获取 Google 和 Microsoft 两个 OAuth 平台的配置信息。

---

## 1. Google OAuth

### 前提条件
- Google 账号（个人或企业均可）
- 无需付费

### 步骤

#### 1.1 打开 Google Cloud Console
访问 [https://console.cloud.google.com/](https://console.cloud.google.com/)

如果没有项目，点击顶部「Select a project」→「NEW PROJECT」创建新项目：
- Project name: `ToolBoxNova`（或其他名称）
- Organization: 选择你的组织（个人账号可选「No organization」）

#### 1.2 配置 OAuth 同意屏幕
左侧菜单 → **APIs & Services** → **OAuth consent screen**

选择用户类型：
- **External**：允许任何 Google 账号登录（推荐）
- **Internal**：仅限组织内部（需要企业账号）

填写基本信息：
| 字段 | 值 |
|------|-----|
| App name | ToolBoxNova |
| User support email | 你的邮箱 |
| App logo | 可选，上传网站 logo |
| Application home page | https://ycjson.top |
| Application privacy policy link | https://ycjson.top/privacy-policy |
| Application terms of service link | https://ycjson.top/terms-of-service |
| Authorized domains | ycjson.top |
| Developer contact email | 你的邮箱 |

点击「SAVE AND CONTINUE」。

**Scopes 页面**：
- 点击「ADD OR REMOVE SCOPES」
- 添加以下 scope：
  - `.../auth/userinfo.email`（必选）
  - `.../auth/userinfo.profile`（必选）
- 点击「UPDATE」→「SAVE AND CONTINUE」

**Test users 页面**（仅 External 类型且未发布时需要）：
- 添加你的测试邮箱
- 点击「SAVE AND CONTINUE」

点击「BACK TO DASHBOARD」完成。

#### 1.3 创建 OAuth 客户端
左侧菜单 → **APIs & Services** → **Credentials**

点击顶部「CREATE CREDENTIALS」→ **OAuth client ID**

| 字段 | 值 |
|------|-----|
| Application type | Web application |
| Name | ToolBoxNova Web Client |

**Authorized JavaScript origins**（添加以下）：
```
https://ycjson.top
http://localhost:5009
```

**Authorized redirect URIs**（添加以下）：
```
https://ycjson.top/auth/google/callback
http://localhost:5009/auth/google/callback
```

点击「CREATE」。

#### 1.4 获取配置信息
创建成功后，弹窗显示：
- **Your Client ID**：这就是 `client_id`
- **Your Client Secret**：这就是 `client_secret`

复制这两个值，填入 `config.json`：

```json
"google": {
  "client_id": "xxx.apps.googleusercontent.com",
  "client_secret": "GOCSPX-xxx"
}
```

#### 1.5 发布应用（可选）
如果选择了 External 且需要所有用户都能登录：
- OAuth consent screen 页面 → 点击「PUBLISH APP」
- 发布后，任何 Google 用户都可以登录（不再需要添加测试用户）

---

## 2. Microsoft (Azure AD)

### 前提条件
- Microsoft 账号（个人 Hotmail/Outlook 或企业 Azure AD）
- 无需付费（Azure 免费账号即可）

### 步骤

#### 2.1 打开 Azure Portal
访问 [https://portal.azure.com/](https://portal.azure.com/)

登录你的 Microsoft 账号

#### 2.2 注册应用
左侧菜单 → **Azure Active Directory** → **App registrations**

点击「New registration」：

| 字段 | 值 |
|------|-----|
| Name | ToolBoxNova |
| Supported account types | Accounts in any organizational directory and personal Microsoft accounts（即多租户） |
| Redirect URI (optional) | Web: `https://ycjson.top/auth/microsoft/callback` |

点击「Register」。

#### 2.3 获取配置信息

注册成功后，应用概述页面显示：
- **Application (client) ID**：这就是 `client_id`

左侧菜单 → **Certificates & secrets** → **Client secrets**
- 点击「New client secret」
- Description: `ToolBoxNova Secret`
- Expires: 选择有效期（建议选择最长 730 days）
- 点击「Add」

**立即复制 Value**（这是 `client_secret`，离开页面后无法再次查看！）

#### 2.4 配置权限
左侧菜单 → **API permissions**

默认已有 `User.Read`，这就是我们需要的（获取用户基本信息）。

如果需要更多权限，点击「Add a permission」→「Microsoft Graph」→「Delegated permissions」添加。

#### 2.5 填入配置
```json
"microsoft": {
  "client_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "client_secret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "tenant": "common"
}
```

`tenant` 值说明：
- `common`：支持所有 Microsoft 账号（个人 + 企业）✅ 推荐
- `organizations`：仅企业账号
- `consumers`：仅个人账号
- 具体 tenant ID：仅特定组织

---

## 回调 URL 配置清单

确保每个平台都配置了正确的回调 URL：

| 平台 | 回调 URL |
|------|---------|
| Google | `https://ycjson.top/auth/google/callback` |
| Microsoft | `https://ycjson.top/auth/microsoft/callback` |

**本地开发时**，每个平台也应添加：
```
http://localhost:5009/auth/{provider}/callback
```

---

## 测试验证

配置完成后，启动服务：
```bash
go run cmd/server/main.go
```

访问 `http://localhost:5009/auth/login`，点击对应按钮测试登录流程。

### 常见问题

**Q: Google 提示 "Access blocked: This app's request is invalid"**
- 检查回调 URL 是否完全匹配（包括 http/https）
- 确保 OAuth consent screen 已配置并添加测试用户（未发布时）

**Q: Microsoft 返回 "AADSTS50011: The reply URL is invalid"**
- 检查 Redirect URI 是否完全匹配
- 注意 Azure Portal 里填写的是完整 URL，不是域名

---

## 完整配置示例

```json
"oauth": {
  "site_url": "https://ycjson.top",
  "session_cookie_name": "tbn_session",
  "session_ttl_hours": 720,
  "session_secure": true,
  "state_ttl_minutes": 10,
  "google": {
    "client_id": "123456789-abcdef.apps.googleusercontent.com",
    "client_secret": "GOCSPX-xxxxxxxxxxxxx"
  },
  "microsoft": {
    "client_id": "12345678-1234-1234-1234-123456789012",
    "client_secret": "abc123~DEF456-ghi789",
    "tenant": "common"
  }
}
```

---

## 安全建议

1. **不要将 `config.json` 提交到公开仓库**
   - 添加到 `.gitignore`
   - 或使用环境变量覆盖敏感值

2. **定期轮换 secrets**
   - Google/Microsoft 可随时重新生成

3. **生产环境使用 HTTPS**
   - 所有回调 URL 必须是 HTTPS
   - `session_secure: true` 确保 Cookie 仅在 HTTPS 下传输

4. **限制 Redirect URI**
   - 不要使用通配符
   - 仅添加实际使用的域名
