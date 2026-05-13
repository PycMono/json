package http

import (
	"net/http"

	"PycMono/github/json/infrastructure/config"
	authController "PycMono/github/json/infrastructure/controller/http/auth"
	"PycMono/github/json/infrastructure/controller/http/json"
	"PycMono/github/json/infrastructure/controller/http/render"
	tokenController "PycMono/github/json/infrastructure/controller/http/token"
	"PycMono/github/json/infrastructure/controller/http/tools"
	"PycMono/github/json/infrastructure/middleware"
	"time"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, cfg *config.Config) {
	// Initialize security middlewares
	ipBlacklist := middleware.NewIPBlacklistMiddleware(&middleware.IPBlacklistConfig{
		BlackList:     cfg.Security.IPBlacklist,
		CIDRList:      cfg.Security.IPCIDR,
		AutoBlock:     cfg.Security.AutoBlockIPs,
		GrayThreshold: cfg.Security.GrayThreshold,
		BlockDuration: cfg.Security.BlockDuration,
	})

	freqLimit := middleware.NewFreqLimitMiddleware(&middleware.FreqLimitConfig{
		HTMLLimit:   cfg.Security.FreqLimitHTML,
		StaticLimit: cfg.Security.FreqLimitStatic,
		WindowSecs:  cfg.Security.FreqLimitWindow,
	})

	honeypot := middleware.NewHoneypotMiddleware(cfg.Security.HoneypotEnabled)

	challenge := middleware.NewChallengeMiddleware(
		cfg.Security.ChallengeEnabled,
		cfg.Security.TurnstileSiteKey,
		cfg.Security.TurnstileSecretKey,
	)

	r.Use(render.RecoveryMiddleware())
	// Security middlewares (order matters!)
	// 1. IP blacklist check (earliest blocking)
	r.Use(ipBlacklist.IPBlacklist())
	// 2. BotBlock (UA detection)
	r.Use(middleware.BotBlock())
	// 3. Frequency limiting
	r.Use(freqLimit.FreqLimit())
	// 4. Honeypot injection (applies to responses)
	r.Use(honeypot.HoneypotInjector())
	// 5. Challenge verification (for trapped IPs)
	r.Use(challenge.Challenge())
	r.Use(middleware.I18nMiddleware())
	r.Use(middleware.ConsentMiddleware(middleware.ConsentConfig{
		CookieName:   cfg.ConsentCookieName,
		CookieMaxAge: 365 * 24 * 3600,
		Domain:       cfg.Domain,
	}))
	r.Use(middleware.AdsConfig(cfg))
	r.Use(middleware.GAConfig(cfg))
	r.Use(middleware.NoCacheHTML())

	// Optional auth — populates user info for all pages (no redirect)
	r.Use(authController.OptionalAuth())

	r.Use(middleware.StaticCacheHeaders())
	r.Static("/static", "./frontend/static")

	// Security API routes
	security := r.Group("/api/security")
	{
		security.GET("/honeypot/check", honeypotCheckHandler(honeypot))
		security.POST("/honeypot/remove", honeypotRemoveHandler(honeypot))
		security.GET("/challenge", challenge.Challenge())
		security.POST("/challenge/verify", challengeVerifyHandler(challenge, ipBlacklist, honeypot))
	}

	// Common scanner probes — return 404 immediately (before NoRoute/template rendering)
	r.GET("/wp-admin", func(c *gin.Context) { c.AbortWithStatus(http.StatusNotFound) })
	r.GET("/wp-admin/*path", func(c *gin.Context) { c.AbortWithStatus(http.StatusNotFound) })
	r.GET("/wp-login.php", func(c *gin.Context) { c.AbortWithStatus(http.StatusNotFound) })
	r.GET("/.env", func(c *gin.Context) { c.AbortWithStatus(http.StatusNotFound) })

	// IP lookup APIs (server-side to avoid browser CORS)
	r.GET("/api/my-ip", tools.MyIPAPI)
	r.GET("/api/ip-lookup", tools.IPLookupAPI)

	// Honeypot trap routes (now also return 404, but IP gets flagged)
	r.GET("/.well-known/trap", honeypot.HoneypotTrap())
	r.GET("/api/.hidden/trap", honeypot.HoneypotTrap())
	r.GET("/hidden/link/trap", honeypot.HoneypotTrap())
	r.GET("/wp-content/trap.php", honeypot.HoneypotTrap())
	r.GET("/xmlrpc.php", honeypot.HoneypotTrap())
	r.GET("/admin/config", honeypot.HoneypotTrap())
	r.GET("/secret/backup", honeypot.HoneypotTrap())

	// SEO files
	r.GET("/robots.txt", render.RobotsTxt)
	r.GET("/sitemap.xml", render.SitemapXML)
	// Health check (for monitoring)
	r.GET("/health", render.HealthCheck)
	r.GET("/ping", render.HealthCheck)
	// Favicon redirect
	r.GET("/favicon.ico", func(c *gin.Context) {
		c.Redirect(302, "/static/img/favicon.svg")
	})

	// Page routes — homepage serves the JSON toolbox
	r.GET("/", json.JsonToolsHome)

	// ── Auth routes ──────────────────────────────────────────────────
	authGroup := r.Group("/auth")
	{
		authGroup.GET("/login", authController.LoginPage)
		authGroup.POST("/:provider/init", authController.InitOAuth)
		authGroup.GET("/:provider/callback", authController.OAuthCallback)
		authGroup.POST("/logout", authController.Logout)
		authGroup.GET("/me", authController.MePage)
	}

	// ── Email Login API ──────────────────────────────────────────────
	apiAuth := r.Group("/api/auth")
	{
		// Rate limit: 1 request per minute per IP to prevent email bombing
		apiAuth.POST("/email/send-code", middleware.RateLimit(1, time.Minute), authController.SendEmailCode)
		apiAuth.POST("/email/verify", authController.VerifyEmailCode)
	}

	// ── Token Management ─────────────────────────────────────────────
	r.GET("/user/tokens", authController.RequireAuth(), tokenController.TokenDashboardPage)
	tokenAPI := r.Group("/api/token")
	tokenAPI.Use(authController.RequireAuth())
	{
		tokenAPI.GET("/balance", tokenController.GetBalance)
		tokenAPI.GET("/history", tokenController.GetHistory)
		tokenAPI.GET("/stats", tokenController.GetStats)
	}

	// Quota rules (public read)
	r.GET("/api/quota/rules", tokenController.GetRules)

	// Admin-only token endpoints
	adminTokenAPI := r.Group("/api/token")
	adminTokenAPI.Use(authController.RequireAuth())
	adminTokenAPI.Use(middleware.AdminAuth(cfg))
	{
		adminTokenAPI.POST("/grant", tokenController.AdminGrantAPI)
		adminTokenAPI.POST("/refund", tokenController.AdminRefundAPI)
	}

	// Basic site pages
	r.GET("/about", render.AboutPage)
	r.GET("/privacy-policy", render.PrivacyPage)
	r.GET("/cookie-policy", render.CookiePolicyPage)
	r.GET("/terms-of-service", render.TermsPage)
	r.GET("/contact", render.ContactPage)
	r.GET("/sitemap", render.SitemapPage)

	// Developer Tools routes
	r.GET("/tools", json.JsonToolsHome)
	toolsGroup := r.Group("/tools")
	{
		toolsGroup.GET("/regex", json.RegexToolPage)
		toolsGroup.GET("/markdown", json.MarkdownToolPage)
		toolsGroup.GET("/timestamp", json.TimestampToolPage)
		toolsGroup.GET("/timestamp-guide", json.TimestampGuidePage)
		toolsGroup.GET("/base-converter", json.BaseConverterPage)
		toolsGroup.GET("/base-converter-guide", json.BaseConverterGuidePage)
		toolsGroup.GET("/case-converter", json.CaseConverterPage)
	}

	// ── New JSON Toolkit routes (/json/*)  ──────────────────────
	jt := r.Group("/json")
	{
		// Home
		jt.GET("", json.JsonToolsHome)
		jt.GET("/", json.JsonToolsHome)

		// Validate & Format
		jt.GET("/validate", json.JsonToolPage("validate"))
		jt.GET("/repair", json.JsonToolPage("repair"))
		jt.GET("/pretty", json.JsonToolPage("pretty"))
		jt.GET("/minify", json.JsonToolPage("minify"))
		jt.GET("/sort-keys", json.JsonToolPage("sort-keys"))
		jt.GET("/escape", json.JsonToolPage("escape"))
		jt.GET("/unescape", json.JsonToolPage("unescape"))
		jt.GET("/stringify", json.JsonToolPage("stringify"))

		// View & Query
		jt.GET("/tree", json.JsonToolPage("tree"))
		jt.GET("/table", json.JsonToolPage("table"))
		jt.GET("/diff", json.JsonToolPage("diff"))
		jt.GET("/path", json.JsonToolPage("path"))
		jt.GET("/search", json.JsonToolPage("search"))
		jt.GET("/size", json.JsonToolPage("size"))
		jt.GET("/flatten", json.JsonToolPage("flatten"))

		// Data Converters
		jt.GET("/to-csv", json.JsonToolPage("to-csv"))
		jt.GET("/from-csv", json.JsonToolPage("from-csv"))
		jt.GET("/to-excel", json.JsonToolPage("to-excel"))
		jt.GET("/from-excel", json.JsonToolPage("from-excel"))
		jt.GET("/to-yaml", json.JsonToolPage("to-yaml"))
		jt.GET("/from-yaml", json.JsonToolPage("from-yaml"))
		jt.GET("/to-xml", json.JsonToolPage("to-xml"))
		jt.GET("/from-xml", json.JsonToolPage("from-xml"))
		jt.GET("/to-sql", json.JsonToolPage("to-sql"))
		jt.GET("/from-sql", json.JsonToolPage("from-sql"))
		jt.GET("/to-markdown", json.JsonToolPage("to-markdown"))
		jt.GET("/to-toml", json.JsonToolPage("to-toml"))
		jt.GET("/from-toml", json.JsonToolPage("from-toml"))
		jt.GET("/to-query", json.JsonToolPage("to-query"))
		jt.GET("/from-query", json.JsonToolPage("from-query"))

		// Code Generators
		jt.GET("/to-typescript", json.JsonToolPage("to-typescript"))
		jt.GET("/to-python", json.JsonToolPage("to-python"))
		jt.GET("/to-java", json.JsonToolPage("to-java"))
		jt.GET("/to-csharp", json.JsonToolPage("to-csharp"))
		jt.GET("/to-go", json.JsonToolPage("to-go"))
		jt.GET("/to-kotlin", json.JsonToolPage("to-kotlin"))
		jt.GET("/to-swift", json.JsonToolPage("to-swift"))
		jt.GET("/to-rust", json.JsonToolPage("to-rust"))
		jt.GET("/to-php", json.JsonToolPage("to-php"))
		jt.GET("/to-dart", json.JsonToolPage("to-dart"))
		jt.GET("/to-objc", json.JsonToolPage("to-objc"))
		jt.GET("/to-cpp", json.JsonToolPage("to-cpp"))
		jt.GET("/to-ruby", json.JsonToolPage("to-ruby"))
		jt.GET("/to-scala", json.JsonToolPage("to-scala"))

		// Schema
		jt.GET("/schema-validate", json.JsonToolPage("schema-validate"))
		jt.GET("/schema-generate", json.JsonToolPage("schema-generate"))

		// Encoding & Misc
		jt.GET("/base64", json.JsonToolPage("base64"))
		jt.GET("/jwt", json.JsonToolPage("jwt"))
		jt.GET("/jsonc", json.JsonToolPage("jsonc"))
		jt.GET("/token-count", json.JsonToolPage("token-count"))
		jt.GET("/highlight-export", json.JsonToolPage("highlight-export"))

		// Generate & Transform
		jt.GET("/json-generator", json.JsonToolPage("json-generator"))
		jt.GET("/random", json.JsonToolPage("json-generator"))
		jt.GET("/to-url-params", json.JsonToolPage("to-url-params"))
		jt.GET("/from-url-params", json.JsonToolPage("from-url-params"))
		jt.GET("/python-dict", json.JsonToolPage("python-dict"))

		// New Tools — Generate & Transform
		jt.GET("/jsonl", json.JsonToolPage("jsonl"))
		jt.GET("/merge", json.JsonToolPage("merge"))
		jt.GET("/transform", json.JsonToolPage("transform"))
		jt.GET("/patch", json.JsonToolPage("patch"))
		jt.GET("/mock", json.JsonToolPage("mock"))
		jt.GET("/to-zod", json.JsonToolPage("to-zod"))
		jt.GET("/to-graphql", json.JsonToolPage("to-graphql"))
		jt.GET("/to-env", json.JsonToolPage("to-env"))
		jt.GET("/redact", json.JsonToolPage("redact"))
		jt.GET("/array", json.JsonToolPage("array"))
		jt.GET("/key-transform", json.JsonToolPage("key-transform"))

		// Token Count backend API
		jt.POST("/api/token-count", json.TokenCountAPI)

		// JSON Datasets
		jt.GET("/datasets", json.JSONDatasetsPage)
		jt.GET("/datasets/:slug", json.JSONDatasetsPage) // detail page reuses same template

		// JSON Learn Hub
		jt.GET("/learn", json.JSONLearnHub)
		jt.GET("/learn/:slug", json.JSONLearnArticle)
	}

	// Developer Tools Suite — /dev/*
	dev := r.Group("/dev")
	{
		dev.GET("/hash", tools.DevHashPage)
		dev.GET("/hash-guide", tools.DevHashGuidePage)
		dev.GET("/base64", tools.DevBase64Page)
		dev.GET("/url-encode", tools.DevURLEncodePage)
		dev.GET("/ip", tools.DevIPPage)
		dev.GET("/whois", tools.DevWhoisPage)
		dev.GET("/whois-guide", tools.DevWhoisGuidePage)
		dev.GET("/word-counter", tools.DevWordCounterPage)
		dev.GET("/uuid", tools.DevUUIDPage)
		dev.GET("/lorem", tools.DevLoremPage)
		dev.GET("/aes", tools.DevAESPage)
		dev.GET("/html-entities", tools.DevHTMLEntitiesPage)
		dev.GET("/diff", tools.DevDiffPage)
		dev.GET("/user-agent", tools.DevUserAgentPage)
		dev.GET("/user-agent-guide", tools.DevUserAgentGuidePage)
	}

	// API routes
	api := r.Group("/api")
	{
		api.GET("/search", render.SearchAPI)

		// Whois proxy (for /dev/whois)
		api.GET("/whois", tools.WhoisAPI)

		// Tools API
		toolsAPI := api.Group("/tools")
		{
			// JSON URL proxy fetch
			toolsAPI.GET("/json/fetch",
				middleware.RateLimit(30, time.Minute),
				json.JSONFetch,
			)
		}
	}

	// 404 handler — must be last
	r.NoRoute(render.NotFoundPage)
}
