package http

import (
	"net/http"

	"PycMono/github/json/infrastructure/config"
	"PycMono/github/json/infrastructure/controller/http/ai"
	authController "PycMono/github/json/infrastructure/controller/http/auth"
	"PycMono/github/json/infrastructure/controller/http/color"
	"PycMono/github/json/infrastructure/controller/http/email"
	"PycMono/github/json/infrastructure/controller/http/image"
	"PycMono/github/json/infrastructure/controller/http/json"
	pdfController "PycMono/github/json/infrastructure/controller/http/pdf"
	"PycMono/github/json/infrastructure/controller/http/privacy-check"
	"PycMono/github/json/infrastructure/controller/http/proxy"
	"PycMono/github/json/infrastructure/controller/http/qrcode"
	"PycMono/github/json/infrastructure/controller/http/render"
	"PycMono/github/json/infrastructure/controller/http/sms"
	tokenController "PycMono/github/json/infrastructure/controller/http/token"
	"PycMono/github/json/infrastructure/controller/http/tools"
	"PycMono/github/json/infrastructure/controller/http/weather"
	"PycMono/github/json/infrastructure/middleware"
	"time"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, cfg *config.Config) {
	// Init image services
	image.InitOCRService(cfg.OCRSpaceAPIKey)

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

	// Page routes
	r.GET("/", render.IndexPage)

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

	// SMS Receiver routes (S-01)
	r.GET("/sms", sms.SMSLandingPage)
	r.GET("/sms/buy", sms.SMSBuyPage)
	r.GET("/sms/prices", sms.SMSPricesPage)
	r.GET("/sms/active", sms.SMSActivePage)
	r.GET("/sms/history", sms.SMSHistoryPage)
	r.GET("/sms/faq", sms.SMSFAQPage)

	// Privacy Check routes
	privacy := r.Group("/privacy")
	{
		privacy.GET("/check", privacy_check.PrivacyCheckPage)
	}

	// ── Privacy tools (standalone routes) ──────────────────────────
	r.GET("/proxy/list", proxy.ProxyListPage)

	// ── Weather Tools ─────────────────────────────────────────────
	weatherGroup := r.Group("/weather")
	{
		weatherGroup.GET("/query", weather.QueryPage)
	}
	privacyAPI := r.Group("/api/privacy")
	{
		privacyAPI.POST("/check-email", privacy_check.PrivacyCheckEmail)
		privacyAPI.GET("/password-range/:prefix", privacy_check.PrivacyPasswordRange)
		privacyAPI.GET("/breaches", privacy_check.PrivacyBreaches)
		// Proxy breach logos so frontend never directly loads from external sites
		privacyAPI.GET("/logo/:name", privacy_check.PrivacyBreachLogo)
	}

	r.GET("/virtual-address", render.VirtualAddressPage)
	r.GET("/temp-email", email.TempEmailPage)
	r.GET("/proxy", proxy.ProxyPage)
	r.GET("/browser-fingerprint", render.BrowserFingerprintPage)

	// Redirect removed standalone pages to privacy check (merged into tabs)
	r.GET("/password-generator", func(c *gin.Context) { c.Redirect(301, "/privacy/check") })
	r.GET("/password-checker", func(c *gin.Context) { c.Redirect(301, "/privacy/check") })
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

		// Media tools
		toolsGroup.GET("/media", json.MediaToolsPage)
		toolsGroup.GET("/media/image-compress", image.ImgCompressPage)
		toolsGroup.GET("/media/color-converter", json.ColorConverterPage)
		toolsGroup.GET("/media/unit-converter", json.UnitConverterPage)
		toolsGroup.GET("/media/qr-generator", qrcode.QRGeneratorPage)
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
	// AI routes (canonical /ai/*)
	aiGroup := r.Group("/ai")
	{
		aiGroup.GET("/humanize", ai.HumanizePage) // unified hub (tabs: home/humanizer/detector)
		aiGroup.GET("/detector", ai.DetectorPage)
		aiGroup.GET("/humanizer", ai.HumanizerPage)
		aiGroup.GET("/compete", ai.AiCompeteLandingPage)
		aiGroup.GET("/plagiarism-checker", ai.PlagiarismPage)
		aiGroup.GET("/compete/analyze", ai.AiCompetePage)
		aiGroup.GET("/essay", ai.EssayPage)
		aiGroup.GET("/sentence-rewriter", ai.SentenceRewriterPage)
		aiGroup.GET("/for-college", ai.ForCollegePage)
		aiGroup.GET("/for-professors", ai.ForProfessorsPage)
		aiGroup.GET("/paragraph-rewriter", ai.ParagraphRewriterPage)
		aiGroup.GET("/article-rewriter", ai.ArticleRewriterPage)
		aiGroup.GET("/detector/for-academic-writing", ai.DetectorAcademicPage)
		aiGroup.GET("/image", ai.AIImagePage)
		aiGroup.GET("/image-generator", ai.AIImageLandingPage)
	}

	// Image/Multimedia tools
	img := r.Group("/img")
	{
		img.GET("/compress", image.ImgCompressPage)
		img.GET("/compress-guide", image.ImgCompressGuidePage)
		img.GET("/resize", image.ImgResizePage)
		img.GET("/resize-guide", image.ImgResizeGuidePage)
		img.GET("/metadata", image.ImgMetadataPage)
		img.GET("/metadata-guide", image.ImgMetadataGuidePage)
		// Image Toolbox (I-00 ~ I-04)
		img.GET("/crop", image.ImgCropPage)
		img.GET("/crop-guide", image.ImgCropGuidePage)
		img.GET("/convert-to-jpg", image.ImgConvertToJpgPage)
		img.GET("/convert-to-jpg-guide", image.ImgConvertToJpgGuidePage)
		img.GET("/jpg-to-image", image.ImgJpgToImagePage)
		img.GET("/jpg-to-image-guide", image.ImgJpgToImageGuidePage)
		img.GET("/photo-editor", image.ImgPhotoEditorPage)
		img.GET("/photo-editor-guide", image.ImgPhotoEditorGuidePage)
		img.GET("/remove-bg", image.ImgRemoveBgPage)
		img.GET("/remove-bg-guide", image.ImgRemoveBgGuidePage)
		img.GET("/watermark", image.ImgWatermarkPage)
		img.GET("/watermark-guide", image.ImgWatermarkGuidePage)
		img.GET("/rotate", image.ImgRotatePage)
		img.GET("/rotate-guide", image.ImgRotateGuidePage)
		// New image tools
		img.GET("/ocr", image.ImgOCRPage)
		img.GET("/ocr-guide", image.ImgOCRGuidePage)
		img.GET("/to-video", image.ImgToVideoPage)
		img.GET("/to-video-guide", image.ImgToVideoGuidePage)
		img.GET("/to-pdf", image.ImgToPDFPage)
		img.GET("/to-pdf-guide", image.ImgToPDFGuidePage)
	}

	// Media tools (alias for img)
	media := r.Group("/media")
	{
		media.GET("/image-compress", image.ImgCompressPage)
		media.GET("/image-resize", image.ImgResizePage)
		media.GET("/image-resize-guide", image.ImgResizeGuidePage)
		media.GET("/image-metadata", image.ImgMetadataPage)
		media.GET("/image-metadata-guide", image.ImgMetadataGuidePage)
		// QR Code Generator
		media.GET("/qr", qrcode.QRPage)
		media.GET("/qr-guide", qrcode.QRGuidePage)
		media.POST("/qr/api/eps", qrcode.QREpsDownload)
	}

	// ── PDF Tools Suite — /pdf/* ──────────────────────────────
	pdfGroup := r.Group("/pdf")
	{
		pdfGroup.GET("/reorder", pdfController.ReorderPage)
		pdfGroup.GET("/extract-text", pdfController.ExtractTextPage)
		pdfGroup.GET("/merge", pdfController.MergePage)
		pdfGroup.GET("/split", pdfController.SplitPage)
		pdfGroup.GET("/to-image", pdfController.ToImagePage)
		pdfGroup.GET("/watermark", pdfController.WatermarkPage)
		pdfGroup.GET("/encrypt", pdfController.EncryptPage)
		pdfGroup.GET("/compress", pdfController.CompressPage)
	}

	// ── Color Tools Suite — /color/* ──────────────────────────────
	colorGroup := r.Group("/color")
	{
		colorGroup.GET("/tools", color.ColorToolsHub)
		colorGroup.GET("/picker", color.ColorPickerPage)
		colorGroup.GET("/palette", color.ColorPalettePage)
		colorGroup.GET("/wheel", color.ColorWheelPage)
		colorGroup.GET("/converter", color.ColorConverterV2Page)
		colorGroup.GET("/contrast", color.ColorContrastPage)
		colorGroup.GET("/gradient", color.ColorGradientPage)
		colorGroup.GET("/image-picker", color.ColorImagePickerPage)
		colorGroup.GET("/blindness", color.ColorBlindnessPage)
		colorGroup.GET("/names", color.ColorNamesPage)
		colorGroup.GET("/mixer", color.ColorMixerPage)
		colorGroup.GET("/tailwind", color.ColorTailwindPage)
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

		// AI API (canonical /api/ai/*)
		aiAPI := api.Group("/ai")
		aiAPI.Use(middleware.RateLimit(3, time.Minute))
		{
			aiAPI.POST("/detect", ai.HumanizerDetectAPI)
			aiAPI.POST("/detect-file", ai.DetectFileAPI)
			aiAPI.POST("/humanize", ai.HumanizerStream)
			aiAPI.POST("/humanize-json", ai.HumanizerNewAPI) // JSON (non-streaming) for detector
			aiAPI.POST("/fetch-url", ai.DetectURLAPI)
			aiAPI.POST("/plagiarism-check", ai.PlagiarismCheckAPI)
			aiAPI.POST("/image/generate", ai.AIImageGenerate)
			aiAPI.POST("/image/enhance", ai.AIImageEnhancePrompt)
			aiAPI.GET("/image/models", ai.AIImageModels)
			aiAPI.GET("/image/history", ai.AIImageHistory)
		}

		// API v1 — Public API with API key auth (60 req/min)ntttv1API := api.Group("/v1")ntttv1API.Use(middleware.APIKeyAuth())nttt{nttttv1API.POST("/humanize", ai.HumanizeAPIV1)nttttv1API.POST("/detect", ai.DetectAPIV1)nttt}

		// AI Compete API
		aiCompeteAPI := api.Group("/ai-compete")
		aiCompeteAPI.Use(middleware.RateLimit(3, time.Minute))
		{
			aiCompeteAPI.POST("/analyze", ai.AiCompeteAnalyze)
			aiCompeteAPI.POST("/suggest", ai.AiCompeteSuggest)
		}

		// SMS API (S-05, S-06, S-07, S-08, S-09)
		smsGroup := api.Group("/sms")
		{
			// S-10: 5SIM API 代理层
			smsGroup.GET("/products", sms.SMSGetProducts)
			smsGroup.GET("/countries", sms.SMSGetCountries)
			smsGroup.GET("/operators", sms.SMSGetOperators)
			smsGroup.GET("/prices", sms.SMSGetPrices)
			smsGroup.GET("/price-countries", sms.SMSGetPriceCountries)
			smsGroup.GET("/stats", sms.SMSGetStats)

			// S-06: 订单管理
			smsGroup.POST("/buy", sms.SMSBuyNumber)
			smsGroup.GET("/order/:orderId", sms.SMSGetOrder)
			smsGroup.POST("/order/:orderId/cancel", sms.SMSCancelOrder)
			smsGroup.POST("/order/:orderId/finish", sms.SMSFinishOrder)
			smsGroup.POST("/order/:orderId/rebuy", sms.SMSRebuyNumber)

			// S-07: 活跃订单列表
			smsGroup.GET("/orders/active", sms.SMSGetActiveOrders)

			// S-08: 历史订单列表（分页+筛选）
			smsGroup.GET("/orders/history", sms.SMSGetOrderHistory)
		}

		// 价格快捷路径 /api/prices（与 /api/sms/prices 相同）
		api.GET("/prices", sms.SMSGetPrices)

		// Email API
		emailGroup := api.Group("/email")
		{
			emailGroup.POST("/create", email.EmailCreateAPI)
			emailGroup.POST("/custom", email.EmailCustomAPI)
			emailGroup.GET("/messages/:address", email.EmailMessagesAPI)
			emailGroup.DELETE("/destroy/:address", email.EmailDestroyAPI)
			emailGroup.GET("/stats", email.EmailStatsAPI)
			emailGroup.POST("/extend/:address", email.EmailExtendAPI)
		}

		// Proxy API
		proxyGroup := api.Group("/proxy")
		{
			proxyGroup.POST("/fetch", proxy.ProxyFetchAPI)
			proxyGroup.GET("/stats", proxy.ProxyStatsAPI)
			proxyGroup.GET("/nodes", proxy.ProxyNodesAPI)
		}

		// Proxy List API
		api.GET("/proxy-list/data",
			middleware.RateLimit(30, time.Minute),
			proxy.ProxyListDataAPI)
		api.POST("/proxy-list/refresh",
			middleware.RateLimit(1, 10*time.Minute),
			authController.RequireAuth(),
			middleware.AdminAuth(cfg),
			proxy.ProxyListRefreshAPI)
		api.GET("/proxy-list/export",
			middleware.RateLimit(10, time.Minute),
			proxy.ProxyListExportAPI)

		// Whois proxy (for /dev/whois)
		api.GET("/whois", tools.WhoisAPI)

		// Image Tools API
		imgAPI := api.Group("/img")
		imgAPI.Use(middleware.RateLimit(20, time.Minute))
		{
			imgAPI.POST("/ocr", image.ImgOCRAPI)
		}

		// Tools API
		toolsAPI := api.Group("/tools")
		{
			// JSON URL 代理抓取（每 IP 每分钟最多 30 次）
			toolsAPI.GET("/json/fetch",
				middleware.RateLimit(30, time.Minute),
				json.JSONFetch,
			)
		}
	}

	// 404 handler — must be last
	r.NoRoute(render.NotFoundPage)
}
