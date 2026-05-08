# OAuth 配置指南

本文档详细说明如何获取 Google、Apple、Microsoft、WeChat 四个 OAuth 平台的配置信息。

---

## 1. Google OAuth

### 前提条件
- Google 账号（个人或企业均可）
- 无需付费

### 步骤

#### 1.1 打开 Google Cloud Console
访问 [https://console.cloud.google.com/](https://console.cloud.google.com/)

如果没有项目，点击顶部「Select a project」→「NEW PROJECT」创建新项目：
- Project name: `Free SMS`（或其他名称）
- Organization: 选择你的组织（个人账号可选「No organization」）

#### 1.2 配置 OAuth 同意屏幕
左侧菜单 → **APIs & Services** → **OAuth consent screen**

选择用户类型：
- **External**：允许任何 Google 账号登录（推荐）
- **Internal**：仅限组织内部（需要企业账号）

填写基本信息：
| 字段 | 值 |
|------|-----|
| App name | Free SMS |
| User support email | 你的邮箱 |
| App logo | 可选，上传网站 logo |
| Application home page | https://smsin.me |
| Application privacy policy link | https://smsin.me/privacy-policy |
| Application terms of service link | https://smsin.me/terms-of-service |
| Authorized domains | smsin.me |
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
| Name | Free SMS Web Client |

**Authorized JavaScript origins**（添加以下）：
```
https://smsin.me
http://localhost:5009
```

**Authorized redirect URIs**（添加以下）：
```
https://smsin.me/auth/google/callback
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

## 2. Apple Sign In

### 前提条件
- Apple Developer Program 会员资格（$99/年）
- 已在 App Store Connect 中启用

### 步骤

#### 2.1 打开 Apple Developer
访问 [https://developer.apple.com/](https://developer.apple.com/)

登录你的 Apple ID（需要已付费的开发者账号）

#### 2.2 注册 App ID
左侧菜单 → **Certificates, Identifiers & Profiles** → **Identifiers**

点击「+」按钮创建新 Identifier：
- 选择 **App IDs** → Continue
- 选择 **App** → Continue

填写信息：
| 字段 | 值 |
|------|-----|
| Description | Free SMS Web |
| Bundle ID | Explicit: `com.smsrec.web` |
| Capabilities | 勾选 **Sign in with Apple** |

点击「Continue」→「Register」。

#### 2.3 注册 Service ID（作为 client_id）
再次点击「+」创建 Identifier：
- 选择 **Services IDs** → Continue

填写信息：
| 字段 | 值 |
|------|-----|
| Description | Free SMS Sign In |
| Identifier | `com.smsrec.web.signin`（这就是 **client_id**）|

点击「Continue」→「Register」。

然后点击刚创建的 Service ID → **Configure**：
- Primary App ID: 选择刚才创建的 `com.smsrec.web`
- Web Domain: `smsin.me`
- Return URLs: `https://smsin.me/auth/apple/callback`

点击「Save」→「Continue」→「Save」。

#### 2.4 创建私钥（用于生成 client_secret）
左侧菜单 → **Keys**

点击「+」创建新 Key：
- Key Name: `Free SMS Sign In Key`
- 勾选 **Sign in with Apple**
- 点击「Configure」→ 选择 Primary App ID: `com.smsrec.web`

点击「Continue」→「Register」。

**重要**：
- **Key ID**：显示在列表中，这就是 `key_id`
- 点击「Download」下载 `.p8` 文件（**只能下载一次，请妥善保存！**）
- `.p8` 文件内容就是 `private_key`（去掉换行符，作为一行字符串）

#### 2.5 获取 Team ID
右上角点击你的名字 → **Membership**
- **Team ID**：10位字符，这就是 `team_id`

#### 2.6 填入配置
```json
"apple": {
  "client_id": "com.smsrec.web.signin",
  "team_id": "XXXXXXXXXX",
  "key_id": "XXXXXXXXXX",
  "private_key": "MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...(完整的私钥内容)"
}
```

---

## 3. Microsoft (Azure AD)

### 前提条件
- Microsoft 账号（个人 Hotmail/Outlook 或企业 Azure AD）
- 无需付费（Azure 免费账号即可）

### 步骤

#### 3.1 打开 Azure Portal
访问 [https://portal.azure.com/](https://portal.azure.com/)

登录你的 Microsoft 贎号

#### 3.2 注册应用
左侧菜单 → **Azure Active Directory** → **App registrations**

点击「New registration」：

| 字段 | 值 |
|------|-----|
| Name | Free SMS |
| Supported account types | Accounts in any organizational directory and personal Microsoft accounts（即多租户） |
| Redirect URI (optional) | Web: `https://smsin.me/auth/microsoft/callback` |

点击「Register」。

#### 3.3 获取配置信息

注册成功后，应用概述页面显示：
- **Application (client) ID**：这就是 `client_id`

左侧菜单 → **Certificates & secrets** → **Client secrets**
- 点击「New client secret」
- Description: `Free SMS Secret`
- Expires: 选择有效期（建议选择最长 730 days）
- 点击「Add」

**立即复制 Value**（这是 `client_secret`，离开页面后无法再次查看！）

#### 3.4 配置权限
左侧菜单 → **API permissions**

默认已有 `User.Read`，这就是我们需要的（获取用户基本信息）。

如果需要更多权限，点击「Add a permission」→「Microsoft Graph」→「Delegated permissions」添加。

#### 3.5 填入配置
```json
"microsoft": {
  "client_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "client_secret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "tenant": "common"
}
```

`tenant` 值说明：
- `common`：支持所有 Microsoft 贎号（个人 + 企业）✅ 推荐
- `organizations`：仅企业账号
- `consumers`：仅个人账号
- 具体 tenant ID：仅特定组织

---

## 4. WeChat Open Platform

### 前提条件
- 微信开放平台账号（已实名认证）
- 已认证的服务号（订阅号不支持网页授权）
- 域名已备案（微信要求）

### 步骤

#### 4.1 打开微信开放平台
访问 [https://open.weixin.qq.com/](https://open.weixin.qq.com/)

登录你的微信账号

#### 4.2 创建网站应用
管理中心 → **网站应用** → **创建网站应用**

填写信息：
| 字段 | 值 |
|------|-----|
| 应用名称 | Free SMS |
| 应用简介 | 在线工具箱网站 |
| 应用官网 | https://smsin.me |

上传应用 logo（300x300 像素）。

#### 4.3 填写开发信息
- 授权回调域：`smsin.me`（**注意：只需填写域名，不带 https:// 和路径**）

#### 4.4 提交审核
提交后等待微信团队审核（通常 1-7 个工作日）。

审核通过后：
- **AppID**：这就是 `app_id`
- **AppSecret**：点击「查看」获取，这就是 `app_secret`

#### 4.5 填入配置
```json
"wechat": {
  "app_id": "wxxxxxxxxxxxxxxxx",
  "app_secret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### 注意事项
1. 微信网页授权仅支持**已备案域名**
2. 审核期间可使用测试账号功能（需添加测试微信号）
3. 授权回调域修改需要重新提交审核

---

## 配置优先级建议

| 平台 | 难度 | 成本 | 推荐顺序 |
|------|------|------|---------|
| Google | 低 | 免费 | 1️⃣ 首先配置 |
| Microsoft | 低 | 免费 | 2️⃣ 其次配置 |
| Apple | 中 | $99/年 | 3️⃣ 需要付费账号 |
| WeChat | 高 | 备案要求 | 4️⃣ 国内用户需求 |

---

## 回调 URL 配置清单

确保每个平台都配置了正确的回调 URL：

| 平台 | 回调 URL |
|------|---------|
| Google | `https://smsin.me/auth/google/callback` |
| Apple | `https://smsin.me/auth/apple/callback` |
| Microsoft | `https://smsin.me/auth/microsoft/callback` |
| WeChat | 授权回调域填写 `smsin.me` |

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

**Q: Apple 登录失败 "invalid_client"**
- 检查 private_key 是否完整复制（一行字符串，无换行）
- 确保 Service ID 的 Return URL 正确配置

**Q: Microsoft 返回 "AADSTS50011: The reply URL is invalid"**
- 检查 Redirect URI 是否完全匹配
- 注意 Azure Portal 里填写的是完整 URL，不是域名

**Q: WeChat 提示 "redirect_uri 参数错误"**
- 检查授权回调域是否正确填写（仅域名，不含协议和路径）
- 确认域名已备案且与实际访问域名一致

---

## 完整配置示例

```json
"oauth": {
  "site_url": "https://smsin.me",
  "session_cookie_name": "tbn_session",
  "session_ttl_hours": 720,
  "session_secure": true,
  "state_ttl_minutes": 10,
  "google": {
    "client_id": "123456789-abcdef.apps.googleusercontent.com",
    "client_secret": "GOCSPX-xxxxxxxxxxxxx"
  },
  "apple": {
    "client_id": "com.smsrec.web.signin",
    "team_id": "AB12CD34EF",
    "key_id": "A1B2C3D4E5",
    "private_key": "MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg..."
  },
  "microsoft": {
    "client_id": "12345678-1234-1234-1234-123456789012",
    "client_secret": "abc123~DEF456-ghi789",
    "tenant": "common"
  },
  "wechat": {
    "app_id": "wx1234567890abcdef",
    "app_secret": "1234567890abcdef1234567890abcdef"
  }
}
```

---

## 安全建议

1. **不要将 `config.json` 提交到公开仓库**
    - 添加到 `.gitignore`
    - 或使用环境变量覆盖敏感值

2. **定期轮换 secrets**
    - Google/Microsoft/Azure 可随时重新生成
    - Apple 私钥不可重新生成（需创建新 Key）

3. **生产环境使用 HTTPS**
    - 所有回调 URL 必须是 HTTPS
    - `session_secure: true` 确保 Cookie 仅在 HTTPS 下传输

4. **限制 Redirect URI**
    - 不要使用通配符
    - 仅添加实际使用的域名