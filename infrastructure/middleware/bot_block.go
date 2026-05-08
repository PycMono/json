package middleware

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

// blockedBotPrefixes 列出所有已知 AI 训练爬虫 / 未授权抓取工具的 User-Agent 前缀（小写）。
// robots.txt 只是礼貌性声明，此中间件是强制执行层。
var blockedBotPrefixes = []string{
	// ── OpenAI ────────────────────────────────────────────────────────
	"gptbot",
	"chatgpt-user",
	"oai-searchbot",
	"searchgpt",           // OpenAI搜索爬虫

	// ── Anthropic (Claude) ────────────────────────────────────────────
	"claudebot",
	"claude-web",
	"claude-ai",
	"anthropic-ai",
	"anthropic-claude",

	// ── Google AI (Gemini / Bard) ─────────────────────────────────────
	"google-extended",
	"googleother",
	"gemini-crawler",      // Google Gemini爬虫
	"bing-copilot",        // Bing Copilot
	"copilot-research",    // GitHub Copilot研究

	// ── Meta / Facebook ───────────────────────────────────────────────
	"facebookbot",
	"meta-externalagent",
	"meta-externalfetcher",

	// ── Common Crawl (AI 训练数据主要来源) ─────────────────────────────
	"ccbot",
	"commoncrawl",

	// ── xAI (Grok) ────────────────────────────────────────────────────
	"grok",
	"xai-crawler",

	// ── Perplexity ────────────────────────────────────────────────────
	"perplexitybot",
	"perplexity-crawler",  // Perplexity深度爬取

	// ── ByteDance / TikTok ────────────────────────────────────────────
	"bytespider",

	// ── Apple ─────────────────────────────────────────────────────────
	"applebot-extended",

	// ── Cohere ────────────────────────────────────────────────────────
	"cohere-ai",
	"cohere-training",     // Cohere训练爬虫

	// ── You.com ───────────────────────────────────────────────────────
	"youbot",
	"you.com-crawler",     // You.com爬取

	// ── Diffbot ───────────────────────────────────────────────────────
	"diffbot",

	// ── Timpi ─────────────────────────────────────────────────────────
	"timpibot",

	// ── Omgili / Webz.io ──────────────────────────────────────────────
	"omgilibot",
	"omgili",

	// ── ImagesiftBot ──────────────────────────────────────────────────
	"imagesiftbot",

	// ── Kangaroo Bot ──────────────────────────────────────────────────
	"kangaroobot",

	// ── PetalBot (Huawei) ─────────────────────────────────────────────
	"petalbot",

	// ── DataForSEO ────────────────────────────────────────────────────
	"dataforseobot",

	// ── 新增AI爬虫 (2024-2025) ─────────────────────────────────────────
	"amazonbot",           // Amazon AI购物助手
	"lexica",              // AI图像生成
	"turnitinbot",         // 学术检测
	"chatgpt-prompt",      // Prompt收集
	"poebot",              // Poe AI
	"quora-bot",           // Quora AI
	"firecrawl",           // 网站爬虫服务
	"scraperapi",          // 爬虫API服务
	"crawlbase",           // 爬虫服务
	"scrapingbot",         // 爬虫服务
	"zilliz",              // 向量数据库AI
	"jina.ai",             // AI阅读
	"jina-ai",
	"deepseek-crawler",    // DeepSeek
	"openai-crawler",

	// ── 爬虫服务/代理（通常用于大规模抓取） ─────────────────────────────
	"serpapi",             // SERP API
	"brightdata",          // 代理/爬虫服务
	"oxylabs",             // 代理服务
	"smartproxy",          // 代理服务
	"rayobyte",            // 代理服务
	"netnut",              // 代理服务
	"geosurf",             // 代理服务
	"stormproxies",        // 代理服务
	"proxies",             // 通用代理

	// ── SEO 爬虫（无业务价值，只占带宽） ──────────────────────────────
	"semrushbot",
	"ahrefsbot",
	"mj12bot",
	"dotbot",
	"blexbot",
	"sogou",
	"seznambot",
	"ia_archiver",         // Wayback Machine / Alexa
	"archive.org",         // Archive.org爬虫
	"archive-it",

	// ── AI训练/数据收集服务 ───────────────────────────────────────────
	"aihitbot",            // AI数据收集
	"gpt-crawler",         // GPT训练爬虫
	"llm-collector",       // 大模型数据收集
	"training-data",       // 训练数据收集
	"dataset-collector",   // 数据集收集

	// ── 抓取工具 ───────────────────────────────────────────────────────
	"wget",
	"curl",
	"python-requests",
	"python-urllib",
	"go-http-client",
	"java-http-client",
	"node-fetch",
	"axios",
	"reqbin",
	"http.rb",
	"lwp-simple",
	"libwww-perl",
}

// suspiciousPatterns 可疑的User-Agent模式（正则表达式）
var suspiciousPatterns = []*regexp.Regexp{
	regexp.MustCompile(`^[\w\s]{0,20}$`),               // 过短或空UA
	regexp.MustCompile(`^(curl|wget|python|java|node|go)\b`), // 工具类UA
	regexp.MustCompile(`bot\s*\d+\.\d+$`),                // 版本号结尾的bot
	regexp.MustCompile(`scraper?\s*(\d+\.\d+)?$`),        // scraper
	regexp.MustCompile(`spider\s*(\d+\.\d+)?$`),          // spider
	regexp.MustCompile(`crawler?\s*(\d+\.\d+)?$`),        // crawler
}

// suspiciousHeaders 可疑的请求头组合
func hasSuspiciousHeaders(c *gin.Context) bool {
	// 缺少常见浏览器的必要headers
	hasAccept := c.GetHeader("Accept") != ""
	hasAcceptLang := c.GetHeader("Accept-Language") != ""

	// 同时缺少Accept和Accept-Language很可能是爬虫
	if !hasAccept && !hasAcceptLang {
		return true
	}

	// User-Agent包含工具关键词但伪装成浏览器
	ua := strings.ToLower(c.GetHeader("User-Agent"))
	if strings.Contains(ua, "http") || strings.Contains(ua, "client") ||
	   strings.Contains(ua, "tool") || strings.Contains(ua, "bot") {
		// 检查是否声称是浏览器
		if strings.Contains(ua, "mozilla") && strings.Contains(ua, "chrome") {
			// 伪装成Chrome的工具UA
			return true
		}
	}

	return false
}

// BotBlock 返回一个 Gin 中间件，检测并拦截已知 AI 爬虫和未授权抓取工具。
// 匹配规则：
// 1. User-Agent 字段包含黑名单前缀
// 2. User-Agent 匹配可疑模式
// 3. 缺少必要的浏览器headers
// 返回 403 Forbidden + 标准 robots 提示头。
func BotBlock() gin.HandlerFunc {
	return func(c *gin.Context) {
		ua := strings.ToLower(c.GetHeader("User-Agent"))

		// 规则1: 拦截空UA（绝大多数真实浏览器都会带UA）
		if ua == "" {
			c.Header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet")
			c.AbortWithStatus(http.StatusForbidden)
			return
		}

		// 规则2: 检查黑名单前缀
		for _, blocked := range blockedBotPrefixes {
			if strings.Contains(ua, blocked) {
				c.Header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet")
				c.String(http.StatusForbidden,
					"Access denied. This site does not permit automated crawling or AI training data collection. "+
						"See /robots.txt for our crawling policy.")
				c.Abort()
				return
			}
		}

		// 规则3: 检查可疑的UA模式
		for _, pattern := range suspiciousPatterns {
			if pattern.MatchString(ua) {
				c.Header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet")
				c.String(http.StatusForbidden,
					"Access denied. Suspicious user agent pattern detected.")
				c.Abort()
				return
			}
		}

		// 规则4: 检查可疑的请求头组合
		if hasSuspiciousHeaders(c) {
			c.Header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet")
			c.String(http.StatusForbidden,
				"Access denied. Suspicious request headers detected.")
			c.Abort()
			return
		}

		c.Next()
	}
}
