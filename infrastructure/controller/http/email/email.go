package email

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/domain/repository"
	"PycMono/github/json/infrastructure/config"
	"PycMono/github/json/infrastructure/controller/http/render"
	"context"
	cryptorand "crypto/rand"
	"html/template"
	"math/big"
	"net/http"
	"strings"
	"time"

	logsdk "github.com/PycMono/go-logger-sdk"
	"github.com/gin-gonic/gin"
)

var (
	emailRepo repository.ITempEmailRepository
	emailCfg  config.TempEmailConfig
	// Pre-compiled regex for prefix sanitization
	prefixCleanRegex = strings.NewReplacer(
	// keep only a-z0-9._- via ReplaceAllStringFunc below
	)
)

// validAddrRegex validates email address format for Redis key safety
const validAddrPattern = `^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$`

// InitEmailService initializes the email service with repository and config
func InitEmailService(repo repository.ITempEmailRepository, cfg config.TempEmailConfig) {
	emailRepo = repo
	emailCfg = cfg
}

// randomString generates a cryptographically secure random string
func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		idx, _ := cryptorand.Int(cryptorand.Reader, big.NewInt(int64(len(letters))))
		b[i] = letters[idx.Int64()]
	}
	return string(b)
}

// isValidAddress validates that an address looks like a valid email
func isValidAddress(addr string) bool {
	if len(addr) > 254 || len(addr) < 5 {
		return false
	}
	parts := strings.SplitN(addr, "@", 2)
	if len(parts) != 2 {
		return false
	}
	local := parts[0]
	domain := parts[1]
	if len(local) == 0 || len(domain) < 3 {
		return false
	}
	// Check for safe characters only (prevent Redis key injection)
	for _, c := range addr {
		if !((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '.' || c == '_' || c == '-' || c == '@') {
			return false
		}
	}
	return true
}

// sanitizePrefix cleans a user-provided prefix: lowercase, alphanumeric + ._- only, max 64 chars
func sanitizePrefix(prefix string) string {
	prefix = strings.ToLower(prefix)
	if len(prefix) > 64 {
		prefix = prefix[:64]
	}
	var b strings.Builder
	for _, c := range prefix {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '.' || c == '_' || c == '-' {
			b.WriteRune(c)
		}
	}
	return b.String()
}

// TempEmailPage renders the temporary email page
func TempEmailPage(c *gin.Context) {
	t := render.GetT(c)

	// Build FAQ data from centralized package
	faqs := faq.EmailFAQs(t)

	// Get domains from config, fallback to default if not configured
	domains := emailCfg.Domains
	if len(domains) == 0 {
		domains = []string{"tempmail.dev"}
	}

	data := render.BaseData(c, gin.H{
		"Title":             t("email.title"),
		"Description":       t("email.meta_desc"),
		"Keywords":          "temporary email, temp mail, disposable email, 10 minute mail, fake email",
		"PageClass":         "page-email",
		"SEOArticle":        template.HTML(t("email.seo.article")),
		"FAQs":              faqs,
		"NewsletterEnabled": false,
		"EmailDomains":      domains,
		"JSONLD": template.JS(`{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Temporary Email",
  "applicationCategory": "UtilityApplication",
  "operatingSystem": "Web Browser",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Free disposable temporary email address, auto-expires in 10 minutes.",
  "url": "https://toolboxnova.com/temp-email",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "3280",
    "bestRating": "5"
  }
}`),
	})
	render.Render(c, "temp_email.html", data)
}

// EmailCreateAPI creates a new temporary email address
func EmailCreateAPI(c *gin.Context) {
	prefix := randomString(8)

	// Read optional domain from request body
	domain := ""
	var body struct {
		Domain string `json:"domain"`
	}
	if c.ShouldBindJSON(&body) == nil && body.Domain != "" {
		domain = body.Domain
	}

	// Validate domain against config
	domain = getValidDomain(domain)
	address := prefix + "@" + domain
	expiresAt := time.Now().Add(time.Duration(emailCfg.TTLSeconds) * time.Second).Format(time.RFC3339)

	if emailRepo != nil {
		ctx := context.Background()
		emailRepo.RegisterInbox(ctx, address, int64(emailCfg.TTLSeconds))
		emailRepo.IncrementStats(ctx, "today_created")
	}

	c.JSON(http.StatusOK, gin.H{
		"address":    address,
		"expires_at": expiresAt,
		"expires_in": emailCfg.TTLSeconds,
	})
}

// EmailCustomAPI creates a custom email address
func EmailCustomAPI(c *gin.Context) {
	var body struct {
		Prefix string `json:"prefix"`
		Domain string `json:"domain"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Prefix == "" {
		body.Prefix = randomString(8)
	}

	prefix := sanitizePrefix(body.Prefix)
	if prefix == "" {
		prefix = randomString(8)
	}

	domain := getValidDomain(body.Domain)
	address := prefix + "@" + domain
	expiresAt := time.Now().Add(time.Duration(emailCfg.TTLSeconds) * time.Second).Format(time.RFC3339)

	if emailRepo != nil {
		ctx := context.Background()
		emailRepo.RegisterInbox(ctx, address, int64(emailCfg.TTLSeconds))
		emailRepo.IncrementStats(ctx, "today_created")
	}

	c.JSON(http.StatusOK, gin.H{
		"address":    address,
		"expires_at": expiresAt,
		"expires_in": emailCfg.TTLSeconds,
	})
}

// EmailMessagesAPI returns messages for an email address
func EmailMessagesAPI(c *gin.Context) {
	address := strings.ToLower(c.Param("address"))

	// Validate address format to prevent Redis key injection (C3)
	if !isValidAddress(address) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid address"})
		return
	}

	if emailRepo == nil {
		c.JSON(http.StatusOK, gin.H{"messages": []interface{}{}})
		return
	}

	messages, err := emailRepo.GetMessages(c.Request.Context(), address)
	if err != nil {
		logsdk.Error(c.Request.Context(), "[Email] Failed to get messages",
			logsdk.Err(err),
			logsdk.Any("address", address),
		)
		c.JSON(http.StatusOK, gin.H{"messages": []interface{}{}})
		return
	}

	// Transform to frontend-expected format
	type msgResponse struct {
		From           string `json:"from"`
		Subject        string `json:"subject"`
		Body           string `json:"body"`
		Content        string `json:"content"`
		HTMLBody       string `json:"html_body"`
		ReceivedAt     string `json:"received_at"`
		HasAttachments bool   `json:"has_attachments"`
	}

	result := make([]msgResponse, 0, len(messages))
	for _, m := range messages {
		body := m.TextBody
		if body == "" {
			body = m.HTMLBody
		}
		result = append(result, msgResponse{
			From:           m.From,
			Subject:        m.Subject,
			Body:           body,
			Content:        body,
			HTMLBody:       m.HTMLBody,
			ReceivedAt:     m.ReceivedAt.Format("15:04:05"),
			HasAttachments: m.HasAttachments,
		})
	}

	c.JSON(http.StatusOK, gin.H{"messages": result})
}

// EmailDestroyAPI destroys an email address
func EmailDestroyAPI(c *gin.Context) {
	address := strings.ToLower(c.Param("address"))

	if !isValidAddress(address) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid address"})
		return
	}

	if emailRepo != nil {
		emailRepo.DeleteInbox(c.Request.Context(), address)
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// EmailStatsAPI returns email statistics
func EmailStatsAPI(c *gin.Context) {
	if emailRepo == nil {
		// Fallback to fake stats when temp email is disabled
		c.JSON(http.StatusOK, gin.H{
			"today_created":    1200,
			"spam_intercepted": 8400,
		})
		return
	}

	stats, err := emailRepo.GetStats(c.Request.Context(), []string{
		"today_created",
		"spam_intercepted",
	})
	if err != nil {
		logsdk.Error(c.Request.Context(), "[Email] Failed to get stats", logsdk.Err(err))
		c.JSON(http.StatusOK, gin.H{
			"today_created":    0,
			"spam_intercepted": 0,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"today_created":    stats["today_created"],
		"spam_intercepted": stats["spam_intercepted"],
	})
}

// EmailExtendAPI extends the TTL of an existing email address
func EmailExtendAPI(c *gin.Context) {
	address := strings.ToLower(c.Param("address"))

	if !isValidAddress(address) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid address"})
		return
	}

	if emailRepo != nil {
		emailRepo.RegisterInbox(c.Request.Context(), address, int64(emailCfg.TTLSeconds))
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"expires_in": emailCfg.TTLSeconds,
	})
}

// getValidDomain validates a domain against config, returns default if invalid
func getValidDomain(domain string) string {
	if len(emailCfg.Domains) == 0 {
		return "tempmail.dev"
	}

	if domain == "" {
		return emailCfg.Domains[0]
	}

	domain = strings.ToLower(strings.TrimSpace(domain))
	for _, d := range emailCfg.Domains {
		if strings.EqualFold(d, domain) {
			return d
		}
	}

	return emailCfg.Domains[0]
}
