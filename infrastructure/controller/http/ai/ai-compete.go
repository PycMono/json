package ai

import (
	"PycMono/github/json/common/prompts"
	"PycMono/github/json/infrastructure/controller/http/render"
	aiService "PycMono/github/json/infrastructure/serviceimpl/ai"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ── URL 抓取辅助（竞品推荐增强）────────────────────────────────────────

func looksLikeURL(s string) bool {
	s = strings.TrimSpace(s)
	return strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://")
}

var (
	titleRe      = regexp.MustCompile(`(?i)<title[^>]*>([^<]+)</title>`)
	metaDescRe   = regexp.MustCompile(`(?i)<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']`)
	metaDescRe2  = regexp.MustCompile(`(?i)<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']`)
	scriptRe     = regexp.MustCompile(`(?i)<script[^>]*>[\s\S]*?</script>`)
	styleRe      = regexp.MustCompile(`(?i)<style[^>]*>[\s\S]*?</style>`)
	tagRe        = regexp.MustCompile(`<[^>]+>`)
	whitespaceRe = regexp.MustCompile(`\s+`)
)

// fetchURLContent 抓取 URL 并提取页面文本（标题 + meta description + 可见文本）
func fetchURLContent(ctx context.Context, rawURL string) (string, error) {
	parsedURL, err := url.ParseRequestURI(rawURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return "", fmt.Errorf("invalid URL")
	}

	host := strings.ToLower(parsedURL.Hostname())
	if isBlockedHost(host) {
		return "", fmt.Errorf("blocked host")
	}

	resolvedIPs, err := net.LookupHost(host)
	if err != nil {
		return "", fmt.Errorf("DNS lookup failed")
	}
	for _, ip := range resolvedIPs {
		parsedIP := net.ParseIP(ip)
		if parsedIP == nil || parsedIP.IsLoopback() || parsedIP.IsPrivate() || parsedIP.IsLinkLocalUnicast() || parsedIP.IsLinkLocalMulticast() || parsedIP.IsUnspecified() {
			return "", fmt.Errorf("blocked IP")
		}
	}

	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			redirectHost := strings.ToLower(req.URL.Hostname())
			if isBlockedHost(redirectHost) {
				return fmt.Errorf("redirect to blocked host")
			}
			redirectIPs, err := net.LookupHost(redirectHost)
			if err == nil {
				for _, ip := range redirectIPs {
					parsedIP := net.ParseIP(ip)
					if parsedIP == nil || parsedIP.IsLoopback() || parsedIP.IsPrivate() || parsedIP.IsLinkLocalUnicast() || parsedIP.IsLinkLocalMulticast() || parsedIP.IsUnspecified() {
						return fmt.Errorf("redirect to blocked IP")
					}
				}
			}
			return nil
		},
	}

	req, err := http.NewRequestWithContext(ctx, "GET", rawURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept-Encoding", "gzip")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	var reader io.Reader = resp.Body
	if resp.Header.Get("Content-Encoding") == "gzip" {
		gr, err := gzip.NewReader(resp.Body)
		if err == nil {
			defer gr.Close()
			reader = gr
		}
	}

	limited := io.LimitReader(reader, 512*1024+1) // 512KB max
	body, err := io.ReadAll(limited)
	if err != nil {
		return "", err
	}
	if int64(len(body)) > 512*1024 {
		body = body[:512*1024]
	}

	html := string(body)

	// Extract title
	var title string
	if m := titleRe.FindStringSubmatch(html); len(m) > 1 {
		title = strings.TrimSpace(m[1])
	}

	// Extract meta description
	var metaDesc string
	if m := metaDescRe.FindStringSubmatch(html); len(m) > 1 {
		metaDesc = strings.TrimSpace(m[1])
	} else if m := metaDescRe2.FindStringSubmatch(html); len(m) > 1 {
		metaDesc = strings.TrimSpace(m[1])
	}

	// Extract visible text
	visible := html
	visible = scriptRe.ReplaceAllString(visible, " ")
	visible = styleRe.ReplaceAllString(visible, " ")
	visible = tagRe.ReplaceAllString(visible, " ")
	visible = whitespaceRe.ReplaceAllString(visible, " ")
	visible = strings.TrimSpace(visible)

	// Truncate visible text to ~3000 chars to stay within token limits
	if len(visible) > 3000 {
		visible = visible[:3000]
	}

	var parts []string
	if title != "" {
		parts = append(parts, "页面标题: "+title)
	}
	if metaDesc != "" {
		parts = append(parts, "Meta描述: "+metaDesc)
	}
	if visible != "" {
		parts = append(parts, "页面正文:\n"+visible)
	}

	if len(parts) == 0 {
		return "", fmt.Errorf("no content extracted")
	}
	return strings.Join(parts, "\n"), nil
}

// ── Handlers ───────────────────────────────────────────────────────────

// AiCompeteLandingPage renders the SEO landing page at /ai/compete
func AiCompeteLandingPage(c *gin.Context) {
	t := render.GetT(c)

	render.Render(c, "ai-compete-landing.html", render.BaseData(c, gin.H{
		"Title":       t("ai-compete.seo.title") + " | json",
		"Description": t("ai-compete.seo.desc"),
		"Keywords":    t("ai-compete.seo.keywords"),
		"PageClass":   "page-ai-compete",
		"Canonical":   "https://toolboxnova.com/ai/compete",
		"HreflangZH":  "https://toolboxnova.com/ai/compete?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/ai/compete?lang=en",
		"HreflangJA":  "https://toolboxnova.com/ai/compete?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/ai/compete?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/ai/compete?lang=spa",
	}))
}

// AiCompetePage renders the analysis tool page at /ai/compete/analyze
func AiCompetePage(c *gin.Context) {
	t := render.GetT(c)
	//lang := render.GetLang(c)

	render.Render(c, "ai-compete.html", render.BaseData(c, gin.H{
		"Title":       t("ai-compete.seo.title") + " | json",
		"Description": t("ai-compete.seo.desc"),
		"Keywords":    t("ai-compete.seo.keywords"),
		"PageClass":   "page-ai-compete",
		"Canonical":   "https://toolboxnova.com/ai/compete/analyze",
		"HreflangZH":  "https://toolboxnova.com/ai/compete/analyze?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/ai/compete/analyze?lang=en",
		"HreflangJA":  "https://toolboxnova.com/ai/compete/analyze?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/ai/compete/analyze?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/ai/compete/analyze?lang=spa",
	}))
}

type AiCompeteAnalyzeRequest struct {
	ProductDesc string   `json:"product_desc"`
	Competitors []string `json:"competitors"`
	Dimensions  []string `json:"dimensions"`
	Lang        string   `json:"lang"`
}

func AiCompeteAnalyze(c *gin.Context) {
	var req AiCompeteAnalyzeRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.ProductDesc) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "product_desc is required"})
		return
	}
	if len(req.Competitors) == 0 || len(req.Competitors) > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "1-5 competitors required"})
		return
	}

	// SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming unsupported"})
		return
	}

	dimensions := req.Dimensions
	if len(dimensions) == 0 {
		dimensions = []string{"marketing", "product", "pricing", "audience", "sentiment", "company", "market", "swot"}
	}
	competitorList := strings.Join(req.Competitors, ", ")
	dimList := strings.Join(dimensions, ", ")

	// Build prompt using shared prompt system
	systemPrompt, userPrompt, err := prompts.Build("compete-analyze.md", map[string]string{
		"ProductDesc": req.ProductDesc,
		"Competitors": competitorList,
		"Dimensions":  dimList,
	})
	if err != nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: {\"msg\":\"prompt load error\"}\n\n")
		flusher.Flush()
		return
	}

	// Get AI provider from configured factory
	factory := aiService.GetFactory()
	if factory == nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: {\"msg\":\"AI service not initialized\"}\n\n")
		flusher.Flush()
		return
	}
	provider, err := factory.GetDefaultProvider()
	if err != nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: {\"msg\":\"no AI provider available\"}\n\n")
		flusher.Flush()
		return
	}

	chatReq := aiService.ChatRequest{
		SystemPrompt: systemPrompt,
		Messages: []aiService.Message{
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.7,
		MaxTokens:   8000,
	}

	ch, err := provider.ChatStream(c.Request.Context(), chatReq)
	if err != nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: {\"msg\":\"AI request failed: %s\"}\n\n", err.Error())
		flusher.Flush()
		return
	}

	for chunk := range ch {
		if chunk.Error != nil {
			fmt.Fprintf(c.Writer, "event: error\ndata: {\"msg\":\"stream error\"}\n\n")
			flusher.Flush()
			return
		}
		if chunk.Done {
			fmt.Fprintf(c.Writer, "event: done\ndata: {}\n\n")
			flusher.Flush()
			return
		}
		if chunk.Content != "" {
			token := strings.ReplaceAll(chunk.Content, "\n", "\\n")
			fmt.Fprintf(c.Writer, "data: %s\n\n", token)
			flusher.Flush()
		}
	}
	fmt.Fprintf(c.Writer, "event: done\ndata: {}\n\n")
	flusher.Flush()
}

// ── AI 推荐竞品接口 ───────────────────────────────────────────────────
type AiCompeteSuggestRequest struct {
	ProductDesc string `json:"product_desc"`
	Lang        string `json:"lang"`
}

func AiCompeteSuggest(c *gin.Context) {
	var req AiCompeteSuggestRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.ProductDesc) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "product_desc is required"})
		return
	}

	productDesc := strings.TrimSpace(req.ProductDesc)

	// 如果输入是 URL，先抓取页面内容作为补充上下文
	if looksLikeURL(productDesc) {
		fetched, err := fetchURLContent(c.Request.Context(), productDesc)
		if err == nil && fetched != "" {
			productDesc = fmt.Sprintf("产品URL: %s\n\n以下是该URL页面的实际内容（请优先根据这些内容判断产品定位，而非仅凭URL或预训练记忆）:\n%s", req.ProductDesc, fetched)
		}
	}

	// Build prompt using shared prompt system
	systemPrompt, userPrompt, err := prompts.Build("compete-suggest.md", map[string]string{
		"ProductDesc": productDesc,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "prompt load error"})
		return
	}

	// Get AI provider from configured factory
	factory := aiService.GetFactory()
	if factory == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service not initialized"})
		return
	}
	provider, err := factory.GetDefaultProvider()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "no AI provider available"})
		return
	}

	chatReq := aiService.ChatRequest{
		SystemPrompt: systemPrompt,
		Messages: []aiService.Message{
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.5,
		MaxTokens:   1024,
	}

	resp, err := provider.Chat(c.Request.Context(), chatReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI request failed"})
		return
	}

	text := strings.TrimSpace(resp.Content)
	// Strip markdown code fences if present
	if strings.HasPrefix(text, "```") {
		lines := strings.Split(text, "\n")
		if len(lines) > 2 {
			text = strings.Join(lines[1:len(lines)-1], "\n")
		}
	}
	text = strings.TrimSpace(text)

	// Parse the structured JSON response from the prompt
	var suggestResult struct {
		DirectCompetitors   []map[string]interface{} `json:"direct_competitors"`
		IndirectCompetitors []map[string]interface{} `json:"indirect_competitors"`
		DiscoveryNotes      string                   `json:"discovery_notes"`
	}
	if err := json.Unmarshal([]byte(text), &suggestResult); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "parse error"})
		return
	}

	// Merge direct + indirect into a flat suggestions array
	var suggestions []map[string]interface{}
	for _, c := range suggestResult.DirectCompetitors {
		c["type"] = "direct"
		suggestions = append(suggestions, c)
	}
	for _, c := range suggestResult.IndirectCompetitors {
		c["type"] = "indirect"
		suggestions = append(suggestions, c)
	}

	c.JSON(http.StatusOK, gin.H{
		"suggestions":     suggestions,
		"discovery_notes": suggestResult.DiscoveryNotes,
		"provider":        resp.Provider,
	})
}
