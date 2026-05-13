package render

import (
	"PycMono/github/json/common/faq"
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GetT extracts the translation function from context
func GetT(c *gin.Context) func(string) string {
	if v, exists := c.Get("T"); exists {
		if fn, ok := v.(func(string) string); ok {
			return fn
		}
	}
	return func(key string) string { return key }
}

// getToolCategory infers the tool category from the URL path
func getToolCategory(path string) string {
	switch {
	case strings.HasPrefix(path, "/json"):
		return "json"
	case strings.HasPrefix(path, "/dev"):
		return "developer"
	case strings.HasPrefix(path, "/color"):
		return "color"
	case strings.HasPrefix(path, "/img") || strings.HasPrefix(path, "/media"):
		return "media"
	case strings.HasPrefix(path, "/ai"):
		return "ai"
	case strings.HasPrefix(path, "/sms"):
		return "sms"
	case strings.HasPrefix(path, "/weather"):
		return "realtime"
	case strings.HasPrefix(path, "/tools"):
		return "developer"
	case strings.HasPrefix(path, "/password") || strings.HasPrefix(path, "/virtual") ||
		strings.HasPrefix(path, "/temp-email") || strings.HasPrefix(path, "/proxy") ||
		strings.HasPrefix(path, "/browser-fingerprint") || strings.HasPrefix(path, "/privacy"):
		return "privacy"
	default:
		return "general"
	}
}

// getToolName infers a tool identifier from the URL path.
// This is used as a fallback when the handler does not explicitly set ToolName.
func getToolName(path string) string {
	// Normalize: remove trailing slash
	if path != "/" && strings.HasSuffix(path, "/") {
		path = path[:len(path)-1]
	}
	// Skip generic pages
	switch path {
	case "/", "/about", "/privacy-policy", "/terms-of-service", "/contact",
		"/cookie-policy", "/sitemap", "/health", "/ping", "/robots.txt":
		return ""
	}
	// Derive from path segments: /json/validate → json-validate
	parts := strings.Split(path, "/")
	var segs []string
	for _, p := range parts {
		if p != "" {
			segs = append(segs, p)
		}
	}
	if len(segs) == 0 {
		return ""
	}
	// Special cases for cleaner names
	if len(segs) >= 2 {
		// /img/compress → img-compress
		// /dev/hash → dev-hash
		// /color/picker → color-picker
		// /ai/detector → ai-detector
		// /pdf/merge → pdf-merge
		// /json/validate → json-validate
		return segs[0] + "-" + segs[1]
	}
	return segs[0]
}

func GetLang(c *gin.Context) string {
	if v, exists := c.Get("lang"); exists {
		if lang, ok := v.(string); ok {
			return lang
		}
	}
	return "zh"
}

func GetTranslations(c *gin.Context) map[string]string {
	if v, exists := c.Get("translations"); exists {
		if t, ok := v.(map[string]string); ok {
			return t
		}
	}
	return map[string]string{}
}

func BaseData(c *gin.Context, extraData gin.H) gin.H {
	t := GetT(c)
	lang := GetLang(c)
	translations := GetTranslations(c)
	data := gin.H{
		"Lang":         lang,
		"T":            t,
		"Translations": translations,
		"CurrentPath":  c.Request.URL.Path,
		"CurrentURL":   c.Request.URL.String(),
		"IsDev":        c.GetBool("IsDev"),
		// Ads (injected by middleware.AdsConfig)
		"AdsClientID": c.GetString("AdsClientID"),
		"AdsEnabled":  c.GetBool("AdsEnabled"),
		// Google Analytics (injected by middleware.GAConfig)
		"GAMeasurementID": c.GetString("GAMeasurementID"),
		"EnableGA":        c.GetBool("EnableGA"),
		// Google Ads Conversion Tracking
		"GoogleAdsConversionID":       c.GetString("GoogleAdsConversionID"),
		"GoogleAdsConversionLabel":    c.GetString("GoogleAdsConversionLabel"),
		"GoogleAdsConversionLabelSMS": c.GetString("GoogleAdsConversionLabelSMS"),
		// Asset version for cache busting (injected by middleware.AdsConfig or set globally)
		"AssetVer": c.GetString("AssetVersion"),
		// Tool metadata (auto-inferred from URL path, or set by individual handlers)
		"ToolName": func() string {
			n := c.GetString("ToolName")
			if n != "" {
				return n
			}
			return getToolName(c.Request.URL.Path)
		}(),
		"ToolCategory": getToolCategory(c.Request.URL.Path),
		// Cookie Consent (injected by middleware.ConsentMiddleware)
		"ConsentHasDecision": c.GetBool("ConsentHasDecision"),
		"ConsentAnalytics":   c.GetString("ConsentAnalytics"),
		"ConsentAds":         c.GetString("ConsentAds"),
		"ConsentCookieName":  c.GetString("ConsentCookieName"),
		// Social Media Links
		"TwitterURL":  c.GetString("TwitterURL"),
		"GitHubURL":   c.GetString("GitHubURL"),
		"LinkedInURL": c.GetString("LinkedInURL"),
		// Newsletter
		"NewsletterEnabled":  c.GetBool("NewsletterEnabled"),
		"NewsletterProvider": c.GetString("NewsletterProvider"),
		// Auth user info (set by OptionalAuth middleware)
		"AuthUser":        c.GetString("AuthUserName"),
		"AuthAvatar":      c.GetString("AuthAvatarURL"),
		"IsAuthenticated": c.GetBool("IsAuthenticated"),
	}
	for k, v := range extraData {
		data[k] = v
	}
	return data
}

// IndexPage Renders the homepage
func IndexPage(c *gin.Context) {
	t := GetT(c)
	lang := GetLang(c)

	// WebSite + Organization structured data for SEO
	jsonld := `{
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"name": "json",
				"url": "https://ycjson.top",
				"description": "` + t("home.hero_sub") + `",
				"potentialAction": {
					"@type": "SearchAction",
					"target": "https://ycjson.top/?q={search_term_string}",
					"query-input": "required name=search_term_string"
				}
			},
			{
				"@type": "Organization",
				"name": "json",
				"url": "https://ycjson.top",
				"logo": "https://ycjson.top/static/img/logo.svg",
				"sameAs": []
			}
		]
	}`

	// Build hreflang map for homepage
	hreflangMap := map[string]string{
		"en":  "https://ycjson.top/?lang=en",
		"zh":  "https://ycjson.top/?lang=zh",
		"ja":  "https://ycjson.top/?lang=ja",
		"ko":  "https://ycjson.top/?lang=ko",
		"spa": "https://ycjson.top/?lang=spa",
	}

	// Homepage FAQ items from centralized package
	faqs := faq.HomeFAQs(t)

	// Build FAQPage JSON-LD for structured data
	faqJSONLD := `{
		"@context": "https://schema.org",
		"@type": "FAQPage",
		"mainEntity": [`
	for i, faq := range faqs {
		if i > 0 {
			faqJSONLD += ","
		}
		faqJSONLD += `{
			"@type": "Question",
			"name": "` + strings.ReplaceAll(faq.Q, `"`, `\"`) + `",
			"acceptedAnswer": {
				"@type": "Answer",
				"text": "` + strings.ReplaceAll(faq.A, `"`, `\"`) + `"
			}
		}`
	}
	faqJSONLD += `]
	}`

	// Combine with existing JSON-LD
	combinedJSONLD := jsonld[:len(jsonld)-3] + `,
		{
			"@type": "FAQPage",
			"mainEntity": ` + faqJSONLD[strings.Index(faqJSONLD, "["):] + `
		}
	]
}`

	data := BaseData(c, gin.H{
		"Title":       t("home.title") + " | json",
		"Description": t("home.hero_sub"),
		"Keywords":    "online tools, developer tools, privacy tools, SMS receiver, temporary email, password generator",
		"PageClass":   "page-home",
		"JSONLD":      template.HTML(combinedJSONLD),
		"HreflangMap": hreflangMap,
		"Lang":        lang,
		"FAQs":        faqs,
	})
	Render(c, "index.html", data)
}

// AboutPage Renders the about page
func AboutPage(c *gin.Context) {
	t := GetT(c)
	data := BaseData(c, gin.H{
		"Title":       t("about.title"),
		"Description": "Learn more about json - your free privacy tool collection.",
		"Keywords":    "about toolboxnova, privacy tools, free online tools",
		"PageClass":   "page-about",
	})
	Render(c, "about.html", data)
}

// PrivacyPage Renders privacy policy
func PrivacyPage(c *gin.Context) {
	t := GetT(c)
	data := BaseData(c, gin.H{
		"Title":       t("privacy.title"),
		"Description": "json Privacy Policy - we never store your data.",
		"Keywords":    "privacy policy, data protection, toolboxnova",
		"PageClass":   "page-privacy",
	})
	Render(c, "privacy.html", data)
}

// CookiePolicyPage renders cookie policy page
func CookiePolicyPage(c *gin.Context) {
	t := GetT(c)
	data := BaseData(c, gin.H{
		"Title":       t("cookie.title"),
		"Description": t("cookie.description"),
		"Keywords":    "cookie policy, cookies, GDPR, consent, toolboxnova",
		"PageClass":   "page-cookie-policy",
	})
	Render(c, "cookie-policy.html", data)
}

// TermsPage Renders terms of service
func TermsPage(c *gin.Context) {
	t := GetT(c)
	data := BaseData(c, gin.H{
		"Title":       t("terms.title"),
		"Description": "json Terms of Service.",
		"Keywords":    "terms of service, user agreement, toolboxnova",
		"PageClass":   "page-terms",
	})
	Render(c, "terms.html", data)
}

// ContactPage Renders contact page
func ContactPage(c *gin.Context) {
	t := GetT(c)
	data := BaseData(c, gin.H{
		"Title":       t("contact.title"),
		"Description": "Contact json team.",
		"Keywords":    "contact, support, toolboxnova",
		"PageClass":   "page-contact",
	})
	Render(c, "contact.html", data)
}

// BrowserFingerprintPage Renders browser fingerprint detector page
func BrowserFingerprintPage(c *gin.Context) {
	t := GetT(c)

	faqs := faq.BrowserFingerprintFAQs(t)

	data := BaseData(c, gin.H{
		"Title":       t("browser-fingerprint.seo.title") + " | json",
		"Description": t("browser-fingerprint.seo.desc"),
		"Keywords":    "browser fingerprint, webRTC leak, canvas fingerprint, privacy test, browser privacy",
		"PageClass":   "page-browser-fingerprint",
		"FAQs":        faqs,
		"SEOArticle":  template.HTML(t("browser-fingerprint.seo.article")),
	})
	// Add aggregateRating to JSONLD
	if ld, ok := data["JSONLD"].(string); ok {
		data["JSONLD"] = strings.Replace(ld, `"offers":`, `"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.8","ratingCount":"2840"},"offers":`, 1)
	}
	Render(c, "browser-fingerprint.html", data)
}

// SitemapPage Renders the HTML sitemap page
func SitemapPage(c *gin.Context) {
	t := GetT(c)
	data := BaseData(c, gin.H{
		"Title":       t("sitemap.title"),
		"Description": "json sitemap - all pages and tools.",
		"Keywords":    "sitemap, toolboxnova",
		"PageClass":   "page-sitemap",
	})
	Render(c, "sitemap.html", data)
}

// SitemapXML generates the XML sitemap
func SitemapXML(c *gin.Context) {
	routes := []string{
		"/", "/about", "/privacy-policy",
		"/terms-of-service", "/contact", "/sitemap",
		"/user/tokens",

		// Dev Tools
		"/tools", "/tools/regex", "/tools/markdown", "/tools/timestamp",
		"/tools/base-converter", "/tools/case-converter",

		// JSON Toolkit
		"/json",
		"/json/validate", "/json/repair", "/json/pretty", "/json/minify",
		"/json/sort-keys", "/json/escape", "/json/unescape", "/json/stringify",
		"/json/tree", "/json/table", "/json/diff", "/json/path",
		"/json/search", "/json/size", "/json/flatten",
		"/json/to-csv", "/json/from-csv", "/json/to-yaml", "/json/from-yaml",
		"/json/to-xml", "/json/from-xml", "/json/to-sql", "/json/from-sql",
		"/json/to-markdown", "/json/to-excel", "/json/from-excel",
		"/json/to-typescript", "/json/to-python", "/json/to-java",
		"/json/to-csharp", "/json/to-go", "/json/to-kotlin",
		"/json/to-swift", "/json/to-rust", "/json/to-php",
		"/json/schema-validate", "/json/schema-generate",
		"/json/base64", "/json/jwt", "/json/jsonc", "/json/token-count",

		// JSON Learn & Datasets
		"/json/learn", "/json/datasets",
		// Basics (10)
		"/json/learn/what-is-json", "/json/learn/json-syntax-rules", "/json/learn/json-data-types",
		"/json/learn/json-objects", "/json/learn/json-arrays",
		"/json/learn/json-strings-escaping", "/json/learn/json-numbers-booleans-null",
		"/json/learn/json-nesting", "/json/learn/first-json-file", "/json/learn/json-formatting-beautify",
		// Multi-Language (10)
		"/json/learn/python-json", "/json/learn/javascript-json", "/json/learn/java-json",
		"/json/learn/go-json", "/json/learn/php-json", "/json/learn/csharp-json",
		"/json/learn/ruby-json", "/json/learn/rust-json", "/json/learn/swift-json", "/json/learn/typescript-json",
		// Debugging (6)
		"/json/learn/common-json-mistakes", "/json/learn/json-parse-errors",
		"/json/learn/unexpected-token", "/json/learn/unexpected-end-of-json",
		"/json/learn/json-syntax-error-debug", "/json/learn/json-debug-tools",
		// Comparison (5)
		"/json/learn/json-vs-xml", "/json/learn/json-vs-yaml", "/json/learn/json-vs-csv",
		"/json/learn/json-vs-protobuf", "/json/learn/json5-jsonc",
		// Advanced Topics (10)
		"/json/learn/json-schema-intro", "/json/learn/json-schema-advanced",
		"/json/learn/jsonpath", "/json/learn/jq-guide", "/json/learn/jwt",
		"/json/learn/json-ld", "/json/learn/json-patch", "/json/learn/json-pointer",
		"/json/learn/ndjson", "/json/learn/geojson",
		// Security & Performance (5)
		"/json/learn/json-security", "/json/learn/json-injection", "/json/learn/json-performance",
		"/json/learn/json-streaming", "/json/learn/json-compression",
		// Practical Applications (7)
		"/json/learn/mongodb-json", "/json/learn/postgresql-json", "/json/learn/elasticsearch-json",
		"/json/learn/rest-api-json", "/json/learn/graphql-json",
		"/json/learn/json-config", "/json/learn/json-ai-llm",

		// Developer Tools Suite
		"/dev/hash", "/dev/base64", "/dev/url-encode",
		"/dev/ip", "/dev/whois", "/dev/word-counter",
		"/dev/uuid", "/dev/lorem",
	}

	c.Header("Content-Type", "application/xml")
	xml := "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
	siteURL := "https://ycjson.top"
	lastMod := time.Now().Format("2006-01-02")

	for _, r := range routes {
		priority := "0.8"
		changefreq := "weekly"

		if r == "/" {
			priority = "1.0"
		} else if r == "/tools" {
			priority = "0.9"
		} else if r == "/json" {
			priority = "0.9"
		} else if r == "/json/validate" || r == "/json/diff" || r == "/json/pretty" ||
			r == "/json/jwt" || r == "/json/to-typescript" || r == "/json/to-yaml" ||
			r == "/json/schema-validate" || r == "/json/repair" {
			priority = "0.85"
		} else if r == "/dev/hash" || r == "/dev/base64" || r == "/dev/ip" {
			priority = "0.9"
		} else if r == "/dev/url-encode" || r == "/dev/whois" || r == "/dev/word-counter" {
			priority = "0.8"
		} else if r == "/json/learn" || r == "/json/datasets" {
			priority = "0.9"
		} else if len(r) > 11 && r[:11] == "/json/learn" {
			priority = "0.8"
		}

		xml += "  <url>\n"
		xml += "    <loc>" + siteURL + r + "</loc>\n"
		xml += "    <lastmod>" + lastMod + "</lastmod>\n"
		xml += "    <changefreq>" + changefreq + "</changefreq>\n"
		xml += "    <priority>" + priority + "</priority>\n"
		xml += "  </url>\n"
	}

	xml += "</urlset>"
	c.String(http.StatusOK, xml)
}

// RobotsTxt returns robots.txt
func RobotsTxt(c *gin.Context) {
	robots := `# ToolBoxNova robots.txt
# https://ycjson.top
# Updated: 2026-04-13 - Comprehensive AI crawler protection

# ── Allow standard search engines ────────────────────────────────────
User-agent: Googlebot
Allow: /
Crawl-delay: 2

User-agent: Bingbot
Allow: /
Crawl-delay: 2

User-agent: DuckDuckBot
Allow: /
Crawl-delay: 2

User-agent: Slurp
Allow: /
Crawl-delay: 2

User-agent: Yandex
Allow: /
Crawl-delay: 2

# ── Block all AI training crawlers ───────────────────────────────────

# OpenAI
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: OAI-SearchBot
Disallow: /

User-agent: SearchGPT
Disallow: /

# Anthropic Claude
User-agent: ClaudeBot
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: anthropic-claude
Disallow: /

# Google Gemini / Bard AI training
User-agent: Google-Extended
Disallow: /

User-agent: GoogleOther
Disallow: /

User-agent: Gemini-Crawler
Disallow: /

# Bing Copilot
User-agent: Bing-Copilot
Disallow: /

User-agent: Copilot-Research
Disallow: /

# Meta / Facebook AI
User-agent: FacebookBot
Disallow: /

User-agent: meta-externalagent
Disallow: /

User-agent: meta-externalfetcher
Disallow: /

# Common Crawl (major AI training data source)
User-agent: CCBot
Disallow: /

User-agent: CommonCrawl
Disallow: /

# xAI (Grok)
User-agent: Grok
Disallow: /

User-agent: xAI-Crawler
Disallow: /

# Perplexity AI
User-agent: PerplexityBot
Disallow: /

User-agent: Perplexity-Crawler
Disallow: /

# ByteDance / TikTok
User-agent: Bytespider
Disallow: /

# Apple AI
User-agent: Applebot-Extended
Disallow: /

# Cohere AI
User-agent: cohere-ai
Disallow: /

User-agent: cohere-training
Disallow: /

# You.com AI
User-agent: YouBot
Disallow: /

User-agent: You.com-Crawler
Disallow: /

# Diffbot
User-agent: Diffbot
Disallow: /

# Timpi
User-agent: Timpibot
Disallow: /

# Omgili / Webz.io
User-agent: omgilibot
Disallow: /

User-agent: omgili
Disallow: /

# ImagesiftBot
User-agent: ImagesiftBot
Disallow: /

# PetalBot (Huawei)
User-agent: PetalBot
Disallow: /

# DataForSEO
User-agent: DataForSeoBot
Disallow: /

# New AI crawlers (2024-2025)
User-agent: AmazonBot
Disallow: /

User-agent: Lexica
Disallow: /

User-agent: TurnitinBot
Disallow: /

User-agent: ChatGPT-Prompt
Disallow: /

User-agent: PoeBot
Disallow: /

User-agent: Quora-Bot
Disallow: /

User-agent: Firecrawl
Disallow: /

User-agent: ScraperAPI
Disallow: /

User-agent: Crawlbase
Disallow: /

User-agent: ScrapingBot
Disallow: /

User-agent: Zilliz
Disallow: /

User-agent: Jina.ai
Disallow: /

User-agent: Jina-AI
Disallow: /

User-agent: DeepSeek-Crawler
Disallow: /

User-agent: OpenAI-Crawler
Disallow: /

# Crawler services/proxies
User-agent: SerpApi
Disallow: /

User-agent: BrightData
Disallow: /

User-agent: Oxylabs
Disallow: /

User-agent: SmartProxy
Disallow: /

User-agent: Rayobyte
Disallow: /

User-agent: Netnut
Disallow: /

User-agent: Geosurf
Disallow: /

User-agent: StormProxies
Disallow: /

# SEO scrapers (no business value)
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BlexBot
Disallow: /

User-agent: Sogou
Disallow: /

User-agent: Seznambot
Disallow: /

User-agent: ia_archiver
Disallow: /

User-agent: Archive.org
Disallow: /

User-agent: Archive-It
Disallow: /

# AI training/data collection services
User-agent: AIHitBot
Disallow: /

User-agent: GPT-Crawler
Disallow: /

User-agent: LLM-Collector
Disallow: /

User-agent: training-data
Disallow: /

User-agent: dataset-collector
Disallow: /

# ── Default rule for all other bots ──────────────────────────────────
User-agent: *
Allow: /

# Disallow API endpoints (no SEO value)
Disallow: /api/

# Disallow auth/account pages
Disallow: /sms/login
Disallow: /sms/register
Disallow: /sms/buy/success
Disallow: /sms/buy/cancel
Disallow: /auth/
Disallow: /user/

Crawl-delay: 2

# Sitemap
Sitemap: https://ycjson.top/sitemap.xml
`
	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.String(http.StatusOK, robots)
}

// SearchAPI returns search results
func SearchAPI(c *gin.Context) {
	q := strings.ToLower(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusOK, gin.H{"results": []interface{}{}})
		return
	}
	tools := []gin.H{
		// JSON Toolkit
		{"name_zh": "JSON 验证器", "name_en": "JSON Validator", "description": "Validate JSON online with error highlighting", "url": "/json/validate", "search": "json validator 验证 lint format"},
		{"name_zh": "JSON 美化", "name_en": "JSON Pretty Print", "description": "Format and pretty print JSON", "url": "/json/pretty", "search": "json format pretty print beautify 格式化"},
		{"name_zh": "JSON 压缩", "name_en": "JSON Minify", "description": "Compress JSON by removing whitespace", "url": "/json/minify", "search": "json minify compress 压缩"},
		{"name_zh": "JSON 修复", "name_en": "JSON Repair", "description": "Auto-fix broken JSON", "url": "/json/repair", "search": "json repair fix 修复"},
		{"name_zh": "JSON 对比", "name_en": "JSON Diff", "description": "Compare two JSON objects side-by-side", "url": "/json/diff", "search": "json diff compare 对比 差异"},
		{"name_zh": "JSON 树形查看", "name_en": "JSON Tree Viewer", "description": "Interactive collapsible tree visualization", "url": "/json/tree", "search": "json tree viewer 树形 可视化"},
		{"name_zh": "JSON 转 TypeScript", "name_en": "JSON to TypeScript", "description": "Generate TypeScript interfaces from JSON", "url": "/json/to-typescript", "search": "json typescript interface type 代码生成"},
		{"name_zh": "JSON 转 Go", "name_en": "JSON to Go", "description": "Generate Go structs from JSON", "url": "/json/to-go", "search": "json go struct golang 代码生成"},
		{"name_zh": "JSON 转 Python", "name_en": "JSON to Python", "description": "Generate Python dataclasses from JSON", "url": "/json/to-python", "search": "json python dataclass 代码生成"},
		{"name_zh": "JSON 转 YAML", "name_en": "JSON to YAML", "description": "Convert JSON to YAML format", "url": "/json/to-yaml", "search": "json yaml convert 转换"},
		{"name_zh": "JWT 解码", "name_en": "JWT Decoder", "description": "Decode and inspect JWT tokens", "url": "/json/jwt", "search": "jwt decode token header payload"},
		{"name_zh": "JSON Schema 验证", "name_en": "JSON Schema Validator", "description": "Validate JSON against a schema", "url": "/json/schema-validate", "search": "json schema validate 验证"},
		{"name_zh": "JSON 工具箱", "name_en": "JSON Toolkit", "description": "40+ free online JSON tools", "url": "/json", "search": "json tools 工具箱 toolkit all"},
		{"name_zh": "JSON 转义", "name_en": "JSON Escape", "description": "Escape or unescape JSON strings", "url": "/json/escape", "search": "json escape unescape 转义"},
		{"name_zh": "JSON 搜索", "name_en": "JSON Search", "description": "Search for keys and values in JSON data", "url": "/json/search", "search": "json search 搜索 find key value"},
		{"name_zh": "JSON 转 CSV", "name_en": "JSON to CSV", "description": "Convert JSON arrays to CSV format", "url": "/json/to-csv", "search": "json csv convert 转换 table"},
		{"name_zh": "JSON 转 SQL", "name_en": "JSON to SQL", "description": "Generate SQL INSERT statements from JSON", "url": "/json/to-sql", "search": "json sql convert insert 转换"},
		{"name_zh": "JSON 数据集", "name_en": "JSON Datasets", "description": "85+ free open-source JSON datasets", "url": "/json/datasets", "search": "json dataset 数据集 sample test free"},
		{"name_zh": "JSON 教程", "name_en": "JSON Learn", "description": "53+ free JSON tutorials from beginner to advanced", "url": "/json/learn", "search": "json learn tutorial 教程 beginner 入门"},
		// Developer Tools Suite
		{"name_zh": "哈希计算器", "name_en": "Hash Generator", "description": "MD5 SHA-1 SHA-256 SHA-512 HMAC hash calculator, client-side", "url": "/dev/hash", "search": "hash md5 sha256 sha512 hmac 哈希 摘要 加密 generator"},
		{"name_zh": "Base64 编解码", "name_en": "Base64 Encoder Decoder", "description": "Encode or decode Base64 text and files up to 50MB", "url": "/dev/base64", "search": "base64 encode decode 编码 解码 base64url mime"},
		{"name_zh": "URL 编解码", "name_en": "URL Encoder Decoder", "description": "Percent-encode or decode URLs, batch mode, diff highlight", "url": "/dev/url-encode", "search": "url encode decode 百分号 编码 解码 percent encoding"},
		{"name_zh": "IP 地址查询", "name_en": "IP Address Lookup", "description": "Find your public IP, geolocation, ISP, ASN with map", "url": "/dev/ip", "search": "ip lookup 查询 地址 geolocation isp asn ipv4 ipv6 我的ip"},
		{"name_zh": "Whois 域名查询", "name_en": "Whois Domain Lookup", "description": "RDAP and raw Whois data for any domain", "url": "/dev/whois", "search": "whois domain 域名 查询 rdap registrar 注册商 到期"},
		{"name_zh": "文字计数器", "name_en": "Word Counter", "description": "Count words, characters, readability score and keyword density", "url": "/dev/word-counter", "search": "word counter 文字 计数 字数 词数 可读性 readability flesch keyword"},
		{"name_zh": "UUID 生成器", "name_en": "UUID Generator", "description": "Generate random UUID v4 and v7 instantly, batch up to 100", "url": "/dev/uuid", "search": "uuid generator guid v4 v7 随机 唯一 标识符"},
		{"name_zh": "Lorem Ipsum 生成器", "name_en": "Lorem Ipsum Generator", "description": "Generate placeholder text for design and prototypes", "url": "/dev/lorem", "search": "lorem ipsum placeholder text dummy 占位 文本 生成"},
		// Text & Dev Tools
		{"name_zh": "正则表达式测试", "name_en": "Regex Tester", "description": "Test and debug regular expressions with real-time matching", "url": "/tools/regex", "search": "regex regular expression 正则 测试 test debug"},
		{"name_zh": "Markdown 编辑器", "name_en": "Markdown Editor", "description": "Live preview Markdown editor", "url": "/tools/markdown", "search": "markdown editor 编辑器 preview live 实时预览"},
		{"name_zh": "时间戳转换", "name_en": "Timestamp Converter", "description": "Convert between Unix timestamp and dates", "url": "/tools/timestamp", "search": "timestamp 时间戳 unix date 日期 转换"},
		{"name_zh": "进制转换", "name_en": "Base Converter", "description": "Convert between binary, octal, decimal, hex", "url": "/tools/base-converter", "search": "base converter 进制 binary octal decimal hex"},
		{"name_zh": "大小写转换", "name_en": "Case Converter", "description": "Convert between camelCase, snake_case, UPPER_CASE", "url": "/tools/case-converter", "search": "case converter 大小写 camelCase snake_case UPPER"},
	}
	var results []gin.H
	for _, tool := range tools {
		if strings.Contains(strings.ToLower(tool["search"].(string)), q) {
			results = append(results, gin.H{
				"name_zh":     tool["name_zh"],
				"name_en":     tool["name_en"],
				"description": tool["description"],
				"url":         tool["url"],
			})
		}
	}
	if results == nil {
		results = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}

// VirtualAddressPage Renders fake identity generator page
func VirtualAddressPage(c *gin.Context) {
	t := GetT(c)

	data := BaseData(c, gin.H{
		"Title":       t("address.title"),
		"Description": t("address.meta_desc"),
		"Keywords":    "fake identity generator, virtual identity, fake address, random identity",
		"PageClass":   "page-address",
		"SEOArticle":  template.HTML(t("address.seo.article")),
		"JSONLD": template.JS(`{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Fake Identity Generator",
  "applicationCategory": "UtilityApplication",
  "operatingSystem": "Web Browser",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Generate random virtual identity info including name, address, phone and email.",
  "url": "https://ycjson.top/virtual-address",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "2150",
    "bestRating": "5"
  }
}`),
	})
	Render(c, "virtual_address.html", data)
}
