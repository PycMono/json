# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ToolBoxNova (ycjson.top) — a privacy-focused online tools website built with Go 1.25 + Gin. Provides tools including SMS receiver, password generator, virtual address generator, temp email, AI detection/humanization, JSON tools, image tools, color tools, PDF tools, QR code, developer utilities, weather, proxy list, and more.

## Common Commands

```bash
go run ./cmd/server         # Run dev server (port from config.json)
PORT=8080 go run ./cmd/server  # Custom port
GIN_MODE=release go run ./cmd/server  # Production mode
go build -o json ./cmd/server    # Build binary
go test ./...               # Run all tests
go test ./infrastructure/controller/http/json/ -run TestFetch  # Run single test
go run ./cmd/sms_seed       # Regenerate SMS seed SQL from 5SIM API
```

No Makefile. Deployment uses `./deployment/deploy.sh`.

## Architecture

### Layered Structure (DDD-inspired)

```
cmd/
  ├── server/main.go        # Entry point — wires all dependencies
  └── sms_seed/main.go      # Regenerates SMS seed SQL from 5SIM API
domain/                     # Core domain: entity, event, factory, interfaces, repository, service
application/service/        # Application services (ai, auth, sms, token)
infrastructure/
  ├── init.go               # Top-level infra wiring
  ├── config/               # Loads config.json via jinzhu/configor
  ├── controller/http/      # HTTP handlers (Gin controllers), grouped by domain
  │   ├── router.go         # All route registrations + middleware setup
  │   ├── security.go       # Security routes/handlers
  │   ├── render/           # Core render(), baseData(), page handlers, error pages
  │   ├── ai/               # AI tool controllers (humanizer, detector, compete, image)
  │   ├── auth/             # OAuth + email login controllers
  │   ├── sms/              # SMS receiver controllers
  │   ├── token/            # Token balance/orders/products controllers
  │   ├── tools/            # General-purpose tools (case, regex, timestamp, markdown, ...)
  │   ├── email/            # Temp email controllers
  │   ├── privacy-check/    # Browser fingerprint / privacy checks
  │   ├── qrcode/           # QR code generator
  │   ├── weather/          # Weather tool
  │   └── json/, image/, pdf/, color/, proxy/   # Other tool domains
  ├── middleware/           # Gin middleware: admin, ads, api_key, bot_block, cache,
  │                         # challenge, consent, freq_limit, ga, honeypot, i18n,
  │                         # ip_blacklist, rate_limit
  ├── persistence/          # Repository implementations (MySQL via GORM, Redis)
  │   ├── auth_repository.go, order_repository.go, product_repository.go
  │   ├── register.go       # Repository registration
  │   ├── sms/              # SMS country/product/price tables
  │   ├── redis/            # Session, OAuth state, email code, temp email repos
  │   ├── token/            # Token balance/transaction repos
  │   ├── proxy/            # Proxy list persistence
  │   └── ai_image/         # AI image generation history
  ├── serviceimpl/          # External service implementations
  │   ├── ai/               # AI provider factory (OpenAI, DeepSeek, Gemini, Doubao, Claude)
  │   ├── 51sms/            # 5SIM API client + SMS data syncer
  │   └── email/            # Resend sender + SMTP receiver
  └── driver/               # Infrastructure drivers (MySQL, Redis, HTTP client, GORM logger)
common/
  ├── i18n/                 # Full i18n engine (loader, manager, translator, detector, watcher)
  │   └── {en,zh,ja,ko,spa}/  # Translation JSON files, one file per namespace
  ├── prompts/              # AI prompt templates (.md files + Go loader)
  ├── faq/                  # FAQ data for various tools (used in SEO pages)
  └── vo/json/              # JSON tool metadata/value objects
frontend/
  ├── manifest.json, sw.js  # PWA manifest + service worker
  ├── templates/            # Go html/template files
  │   ├── base.html         # Base layout
  │   ├── partials/         # Shared partials (navbar, ad_slot, ga, cookie-consent, etc.)
  │   ├── tools_base.html   # Base layout for the `tools/` controller suite
  │   ├── json/_base.html   # JSON tools use their own base layout
  │   └── {ai,img,pdf,color,sms,auth,weather,...}/  # Tool-specific templates
  └── static/               # CSS, JS, images, datasets (served at /static)
chrome-extension/           # Companion Chrome extension (separate Manifest V3 project)
deployment/                 # Deploy scripts (deploy.sh, init_mysql.sh, setup_ssh.sh, ...)
scripts/                    # Python helpers (SEO generators, proxy seeding, address data, SQL)
```

### Request Flow

`Gin Router → Middleware chain → Controller → render.Render() → HTML Template`

Middleware chain (in order): `Recovery → IPBlacklist → BotBlock → FreqLimit → Honeypot → Challenge → I18n → Consent → AdsConfig → GAConfig → NoCacheHTML → OptionalAuth → StaticCacheHeaders`

### Handler Pattern

All page handlers follow this pattern:
```go
func MyPage(c *gin.Context) {
    t := render.GetT(c)     // translation function from context
    data := render.BaseData(c, gin.H{
        "Title":       t("mytool.title") + " | Tool Box Nova",
        "Description": t("mytool.description"),
    })
    render.Render(c, "mytool.html", data)
}
```

`render.Render()` dynamically parses templates per-request to avoid Gin's global `define` block collisions. Templates reference `base.html` automatically. JSON tools use `render.RenderJSONTool()` with `json/_base.html` instead.

### Adding a New Tool

1. Create controller in `infrastructure/controller/http/<domain>/`
2. Create template in `frontend/templates/<domain>/`
3. Create CSS in `frontend/static/css/` and JS in `frontend/static/js/`
4. Register routes in `infrastructure/controller/http/router.go`
5. Add translations to all 5 language dirs under `common/i18n/{en,zh,ja,ko,spa}/`
6. Add tool card to `frontend/templates/index.html`

### i18n System

- **Translation files**: `common/i18n/{en,zh,ja,ko,spa}/*.json` — one JSON file per namespace
- **Key format**: dot-notation, e.g. `t("img.resize.title")`
- **Languages**: English (default/fallback), Chinese, Japanese, Korean, Spanish
- **Detection priority**: URL param `?lang=` > Cookie `lang` > `Accept-Language` header
- **Language aliases**: e.g. `es` → `spa`

### AI Service

`infrastructure/serviceimpl/ai/` implements a factory pattern for AI providers. Each provider (OpenAI, DeepSeek, Gemini, Doubao, Claude) implements a common interface. Task routing maps tasks (detect, humanize, compete, etc.) to specific providers. The humanizer engine (`application/service/ai/engine.go`) supports multiple modes (basic/standard/aggressive/academic/creative/business) with streaming SSE output.

Prompt templates are stored as `.md` files in `common/prompts/` and loaded at startup via `common/prompts/mgr.go`.

### SMS Data Flow

SMS data is synced from 5SIM API into local MySQL tables (`sms_country`, `sms_product`, `sms_price`). On startup, a reconciliation goroutine compares local counts with 5SIM and upserts if needed. Use `go run ./cmd/sms_seed` to regenerate SQL files.

## Key Conventions

- Each tool gets its own CSS file in `frontend/static/css/` and JS file in `frontend/static/js/`
- Cache busting via `?v={{ .AssetVer }}` query parameter on static assets; bump `asset_version` in config.json to invalidate
- Static assets served with 1-year cache headers
- SEO: all pages include title, description, canonical URL, JSON-LD structured data
- Rate limiting on API endpoints (IP-based sliding window via `middleware.RateLimit()`)
- Security stack: IP blacklist, honeypot traps, Turnstile challenge, bot detection, frequency limiting
- Auth: Google/Microsoft OAuth + email verification login; session stored in Redis; optional auth middleware populates user info for all pages
- Module path: `PycMono/github/json`

## Skill: GA Audit (`/ga-audit`)

When the user says "run ga-audit", "执行 GA 审计", "检查埋点", or "audit GA tracking", perform the following steps in order.

### Prerequisites
- Audit script exists at `scripts/ga-audit.go`
- GA library exists at `frontend/static/js/ga-events.js`

### Step 1 — Run the audit
```bash
go run scripts/ga-audit.go .
```
This outputs coverage stats and a list of missing `data-ga` / `gaTrack` instrumentation.

### Step 2 — Analyze the report
Key metrics to check:
- **Templates with data-ga**: should be ~117 / 125 (remaining are base/layout/partials/email, which are exempt)
- **JS files with gaTrack**: should be ~147 / 164 (remaining are pure data/utility files in the audit skip-list)
- **Undefined gaTrack functions**: must be 0 (critical)
- **Unused gaTrack functions**: should be 0 or minimal

### Step 3 — Auto-fix templates
For each template flagged as "has no data-ga or gaTrack":
1. Read the file.
2. Add `data-ga="page_slug"` to the root `<div>` of the content block.
3. Add `data-ga="action_name"` to primary CTA buttons and links.
4. Skip: `base.html`, `tools_base.html`, `json/_base.html`, anything in `partials/` or `email/`.

### Step 4 — Auto-fix JS files
For each JS file flagged as "has no gaTrack calls":
1. Read the file.
2. Find the main user-action function (the function called when the user clicks the primary button).
3. At the **start** of that function, insert:
   ```js
   var _gaStart = Date.now();
   if (typeof gaTrackToolUse === 'function') gaTrackToolUse('TOOL-NAME');
   ```
   Derive `TOOL-NAME` from the filename: `img-compress.js` → `img-compress`, `json-tool-pretty.js` → `json-tool-pretty`.
4. At the **successful end** of processing, insert:
   ```js
   if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('TOOL-NAME', 1, Date.now() - _gaStart);
   ```
5. For copy/download/export helpers in the same file, insert:
   - Copy: `if (typeof gaTrackResultCopy === 'function') gaTrackResultCopy('TOOL-NAME', 'text');`
   - Download: `if (typeof gaTrackDownload === 'function') gaTrackDownload('TOOL-NAME', 'txt');`
6. **Skip-list** (do NOT add tracking to these files, they are pure data / shared utilities):
   - `ga-events.js`, `consent-engine.js`, `theme.js`, `main.js`, any file with `lib` in its name
   - `learn-articles/*.js` (pure article data)
   - `datasets-meta.js`, `json-codegen-core.js`, `json-tool-descriptions.js`, `platform-icons.js`
   - `ai-tool-nav.js`, `img-tabs.js`, `json-home.js`

### Step 5 — Re-audit and report
Run the audit again and confirm:
- No `error` severity issues
- No undefined gaTrack functions
- `Total issues` is ≤ 85 (the remaining info-level "auto-derived ToolName" entries are expected)

Report a concise summary: files changed, issues before vs after, and any manual follow-ups needed.

### Naming Rules
- Use kebab-case for all tool names and event identifiers.
- Match the URL path slug when possible: `/tools/timestamp` → `timestamp`, `/img/compress` → `img-compress`.
- For `json-tool-*.js` files, use the full filename without extension as the tool name.
    