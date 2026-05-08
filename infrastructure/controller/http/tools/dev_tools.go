package tools

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// DevHashPage serves /dev/hash
func DevHashPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.hash.title"),
		"Description": t("seo.hash.description"),
		"Keywords":    t("seo.hash.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/hash",
		"HreflangZH":  "https://toolboxnova.com/dev/hash?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/hash?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "hash"),
		"PageClass":   "page-dev-hash",
		"ToolName":    "hash",
	})
	renderDevTool(c, "dev/hash.html", data)
}

// DevHashGuidePage serves /dev/hash-guide — SEO guide for hash functions
func DevHashGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.hash.guide.title"),
		"Description": t("seo.hash.guide.description"),
		"Keywords":    t("seo.hash.guide.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/hash-guide",
		"HreflangZH":  "https://toolboxnova.com/dev/hash-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/hash-guide?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"PageClass":   "page-dev-hash-guide",
		"ToolName":    "hash-guide",
	})
	renderDevTool(c, "dev/hash-guide.html", data)
}

// DevBase64Page serves /dev/base64
func DevBase64Page(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.base64.title"),
		"Description": t("seo.base64.description"),
		"Keywords":    t("seo.base64.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/base64",
		"HreflangZH":  "https://toolboxnova.com/dev/base64?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/base64?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "base64"),
		"SEOArticle":  template.HTML(t("tools.base64.seo.article")),
		"PageClass":   "page-dev-base64",
		"ToolName":    "base64",
	})
	renderDevTool(c, "dev/base64.html", data)
}

// DevURLEncodePage serves /dev/url-encode
func DevURLEncodePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.url_encode.title"),
		"Description": t("seo.url_encode.description"),
		"Keywords":    t("seo.url_encode.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/url-encode",
		"HreflangZH":  "https://toolboxnova.com/dev/url-encode?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/url-encode?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "url_encode"),
		"SEOArticle":  template.HTML(t("tools.url_encode.seo.article")),
		"PageClass":   "page-dev-url-encode",
		"ToolName":    "url-encode",
	})
	renderDevTool(c, "dev/url-encode.html", data)
}

// DevIPPage serves /dev/ip
func DevIPPage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.ip.title"),
		"Description": t("seo.ip.description"),
		"Keywords":    t("seo.ip.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/ip",
		"HreflangZH":  "https://toolboxnova.com/dev/ip?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/ip?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"SEOArticle":  template.HTML(t("tools.ip.seo.article")),
		"PageClass":   "page-dev-ip",
		"ToolName":    "ip",
	})
	renderDevTool(c, "dev/ip.html", data)
}

// isLocalOrPrivateIP checks if an IP is localhost or RFC1918/RFC4193 private
func isLocalOrPrivateIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return ipStr == "localhost" || ipStr == "::1" || strings.HasPrefix(ipStr, "127.")
	}
	if ip.IsLoopback() || ip.IsPrivate() {
		return true
	}
	return false
}

// fetchPublicIP fetches the server's public IP from httpbin (server-side, no CORS)
func fetchPublicIP() (string, error) {
	resp, err := http.Get("https://httpbin.org/ip")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var result struct {
		Origin string `json:"origin"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.Origin, nil
}

// MyIPAPI returns the client's public IP address (avoids CORS issues with ipify)
func MyIPAPI(c *gin.Context) {
	clientIP := c.ClientIP()
	if isLocalOrPrivateIP(clientIP) {
		if pub, err := fetchPublicIP(); err == nil {
			clientIP = pub
		}
	}
	c.JSON(200, gin.H{"ip": clientIP})
}

// IPLookupAPI proxies IP/domain lookup to ip-api.com (avoids browser CORS)
func IPLookupAPI(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		q = c.ClientIP()
		if isLocalOrPrivateIP(q) {
			if pub, err := fetchPublicIP(); err == nil {
				q = pub
			}
		}
	}

	fields := "status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query,reverse,proxy,mobile"
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=%s", url.PathEscape(q), fields)

	resp, err := http.Get(url)
	if err != nil {
		c.JSON(200, gin.H{"status": "fail", "message": "lookup service unavailable"})
		return
	}
	defer resp.Body.Close()

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		c.JSON(200, gin.H{"status": "fail", "message": "invalid response"})
		return
	}
	c.JSON(200, data)
}

// DevWhoisPage serves /dev/whois
func DevWhoisPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.whois.title"),
		"Description": t("seo.whois.description"),
		"Keywords":    t("seo.whois.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/whois",
		"HreflangZH":  "https://toolboxnova.com/dev/whois?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/whois?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "whois"),
		"PageClass":   "page-dev-whois",
		"ToolName":    "whois",
	})
	renderDevTool(c, "dev/whois.html", data)
}

// DevWhoisGuidePage serves /dev/whois-guide
func DevWhoisGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.whois.guide.title"),
		"Description": t("seo.whois.guide.description"),
		"Keywords":    t("seo.whois.guide.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/whois-guide",
		"HreflangZH":  "https://toolboxnova.com/dev/whois-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/whois-guide?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"PageClass":   "page-dev-whois-guide",
		"ToolName":    "whois-guide",
	})
	renderDevTool(c, "dev/whois-guide.html", data)
}

// DevWordCounterPage serves /dev/word-counter
func DevWordCounterPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.word_counter.title"),
		"Description": t("seo.word_counter.description"),
		"Keywords":    t("seo.word_counter.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/word-counter",
		"HreflangZH":  "https://toolboxnova.com/dev/word-counter?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/word-counter?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "word_counter"),
		"SEOArticle":  template.HTML(t("tools.word_counter.seo.article")),
		"PageClass":   "page-dev-word-counter",
		"ToolName":    "word-counter",
	})
	renderDevTool(c, "dev/word-counter.html", data)
}

// ─────────────────────────────────────────────────────────────
// Whois API proxy
// ─────────────────────────────────────────────────────────────

type WhoisParsed struct {
	Registrar      string   `json:"registrar"`
	CreationDate   string   `json:"creationDate"`
	ExpirationDate string   `json:"expirationDate"`
	UpdatedDate    string   `json:"updatedDate"`
	Status         []string `json:"status"`
	NameServers    []string `json:"nameServers"`
	Registrant     string   `json:"registrant"`
}

type WhoisResult struct {
	Raw    string      `json:"raw"`
	Parsed WhoisParsed `json:"parsed"`
}

// WhoisAPI handles /api/whois?domain=xxx
func WhoisAPI(c *gin.Context) {
	domain := strings.TrimSpace(c.Query("domain"))
	if domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "domain required"})
		return
	}

	result, err := whoisLookup(domain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// whoisLookup tries RDAP first, falls back to raw TCP whois
func whoisLookup(domain string) (*WhoisResult, error) {
	// 1. Try RDAP
	rdapURL := "https://rdap.org/domain/" + domain
	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Get(rdapURL)
	if err == nil && resp.StatusCode == 200 {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		parsed := parseRDAP(body)
		return &WhoisResult{
			Raw:    string(body),
			Parsed: parsed,
		}, nil
	}

	// 2. Fallback: raw Whois via TCP port 43
	raw, err := rawWhoisLookup(domain)
	if err != nil {
		return nil, fmt.Errorf("whois lookup failed: %w", err)
	}
	parsed := parseRawWhois(raw)
	return &WhoisResult{Raw: raw, Parsed: parsed}, nil
}

// parseRDAP parses RDAP JSON response into WhoisParsed
func parseRDAP(body []byte) WhoisParsed {
	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return WhoisParsed{}
	}

	p := WhoisParsed{}

	// Events
	if events, ok := data["events"].([]interface{}); ok {
		for _, ev := range events {
			if e, ok := ev.(map[string]interface{}); ok {
				action, _ := e["eventAction"].(string)
				date, _ := e["eventDate"].(string)
				switch action {
				case "registration":
					p.CreationDate = date
				case "expiration":
					p.ExpirationDate = date
				case "last changed":
					p.UpdatedDate = date
				}
			}
		}
	}

	// Entities (registrar, registrant)
	if entities, ok := data["entities"].([]interface{}); ok {
		for _, ent := range entities {
			if e, ok := ent.(map[string]interface{}); ok {
				roles, _ := e["roles"].([]interface{})
				for _, role := range roles {
					if role == "registrar" {
						if vcardArray, ok := e["vcardArray"].([]interface{}); ok && len(vcardArray) > 1 {
							if vcards, ok := vcardArray[1].([]interface{}); ok {
								for _, vc := range vcards {
									if fields, ok := vc.([]interface{}); ok && len(fields) >= 4 {
										if fields[0] == "fn" {
											p.Registrar, _ = fields[3].(string)
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	// Status
	if statuses, ok := data["status"].([]interface{}); ok {
		for _, s := range statuses {
			if sv, ok := s.(string); ok {
				p.Status = append(p.Status, sv)
			}
		}
	}

	// Nameservers
	if nss, ok := data["nameservers"].([]interface{}); ok {
		for _, ns := range nss {
			if nsMap, ok := ns.(map[string]interface{}); ok {
				if ldhName, ok := nsMap["ldhName"].(string); ok {
					p.NameServers = append(p.NameServers, strings.ToLower(ldhName))
				}
			}
		}
	}

	return p
}

// rawWhoisLookup performs a raw TCP whois query
func rawWhoisLookup(domain string) (string, error) {
	server := whoisServer(domain)
	conn, err := net.DialTimeout("tcp", server+":43", 5*time.Second)
	if err != nil {
		return "", err
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(8 * time.Second))
	fmt.Fprintf(conn, "%s\r\n", domain)
	b, err := io.ReadAll(conn)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// whoisServer returns the best whois server for a given domain
func whoisServer(domain string) string {
	tld := domain
	if idx := strings.LastIndex(domain, "."); idx >= 0 {
		tld = domain[idx+1:]
	}
	servers := map[string]string{
		"com": "whois.verisign-grs.com",
		"net": "whois.verisign-grs.com",
		"org": "whois.pir.org",
		"io":  "whois.nic.io",
		"co":  "whois.nic.co",
		"cn":  "whois.cnnic.cn",
		"uk":  "whois.nic.uk",
		"de":  "whois.denic.de",
		"jp":  "whois.jprs.jp",
		"fr":  "whois.nic.fr",
		"au":  "whois.auda.org.au",
		"ru":  "whois.tcinet.ru",
	}
	if s, ok := servers[strings.ToLower(tld)]; ok {
		return s
	}
	return "whois.iana.org"
}

// parseRawWhois parses raw whois text into WhoisParsed
func parseRawWhois(raw string) WhoisParsed {
	p := WhoisParsed{}
	regs := map[string]*regexp.Regexp{
		"registrar":  regexp.MustCompile(`(?i)registrar:\s*(.+)`),
		"creation":   regexp.MustCompile(`(?i)(?:creation date|created):\s*(.+)`),
		"expiration": regexp.MustCompile(`(?i)(?:expiry date|expiration date|expires):\s*(.+)`),
		"updated":    regexp.MustCompile(`(?i)(?:updated date|last modified|last-modified):\s*(.+)`),
		"status":     regexp.MustCompile(`(?i)domain status:\s*(.+)`),
		"nameserver": regexp.MustCompile(`(?i)name server:\s*(.+)`),
	}

	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if m := regs["registrar"].FindStringSubmatch(line); m != nil && p.Registrar == "" {
			p.Registrar = strings.TrimSpace(m[1])
		}
		if m := regs["creation"].FindStringSubmatch(line); m != nil && p.CreationDate == "" {
			p.CreationDate = strings.TrimSpace(m[1])
		}
		if m := regs["expiration"].FindStringSubmatch(line); m != nil && p.ExpirationDate == "" {
			p.ExpirationDate = strings.TrimSpace(m[1])
		}
		if m := regs["updated"].FindStringSubmatch(line); m != nil && p.UpdatedDate == "" {
			p.UpdatedDate = strings.TrimSpace(m[1])
		}
		if m := regs["status"].FindStringSubmatch(line); m != nil {
			p.Status = append(p.Status, strings.TrimSpace(m[1]))
		}
		if m := regs["nameserver"].FindStringSubmatch(line); m != nil {
			p.NameServers = append(p.NameServers, strings.ToLower(strings.TrimSpace(m[1])))
		}
	}
	return p
}

// renderDevTool renders a dev tool page using the base template
func renderDevTool(c *gin.Context, page string, data gin.H) {
	render.Render(c, page, data)
}

// ─────────────────────────────────────────────────────────────
//
//	UUID Generator & Lorem Ipsum (client-side, handlers only)
//
// ─────────────────────────────────────────────────────────────

// DevUUIDPage serves /dev/uuid
func DevUUIDPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.uuid.title"),
		"Description": t("seo.uuid.description"),
		"Keywords":    t("seo.uuid.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/uuid",
		"HreflangZH":  "https://toolboxnova.com/dev/uuid?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/uuid?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "uuid"),
		"PageClass":   "page-dev-uuid",
		"ToolName":    "uuid",
	})
	renderDevTool(c, "dev/uuid.html", data)
}

// DevLoremPage serves /dev/lorem
func DevLoremPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.lorem.title"),
		"Description": t("seo.lorem.description"),
		"Keywords":    t("seo.lorem.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/lorem",
		"HreflangZH":  "https://toolboxnova.com/dev/lorem?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/lorem?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "lorem"),
		"PageClass":   "page-dev-lorem",
		"ToolName":    "lorem",
	})
	renderDevTool(c, "dev/lorem.html", data)
}

// DevAESPage serves /dev/aes - AES encryption/decryption tool
func DevAESPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.aes.title"),
		"Description": t("seo.aes.description"),
		"Keywords":    t("seo.aes.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/aes",
		"HreflangZH":  "https://toolboxnova.com/dev/aes?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/aes?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "aes"),
		"PageClass":   "page-dev-aes",
		"ToolName":    "aes",
	})
	renderDevTool(c, "dev/aes.html", data)
}

// DevHTMLEntitiesPage serves /dev/html-entities - HTML entity encoding/decoding tool
func DevHTMLEntitiesPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.html_entities.title"),
		"Description": t("seo.html_entities.description"),
		"Keywords":    t("seo.html_entities.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/html-entities",
		"HreflangZH":  "https://toolboxnova.com/dev/html-entities?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/html-entities?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "html_entities"),
		"PageClass":   "page-dev-html-entities",
		"ToolName":    "html_entities",
	})
	renderDevTool(c, "dev/html_entities.html", data)
}

// DevUserAgentPage serves /dev/user-agent — UA parser (100% client-side)
func DevUserAgentPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.ua.title"),
		"Description": t("seo.ua.description"),
		"Keywords":    t("seo.ua.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/user-agent",
		"HreflangZH":  "https://toolboxnova.com/dev/user-agent?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/user-agent?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "user_agent"),
		"PageClass":   "page-dev-user-agent",
		"ToolName":    "user-agent",
	})
	renderDevTool(c, "dev/user-agent.html", data)
}

// DevUserAgentGuidePage serves /dev/user-agent-guide — Developer guide / SEO page for UA strings
func DevUserAgentGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.ua.guide.title"),
		"Description": t("seo.ua.guide.description"),
		"Keywords":    t("seo.ua.guide.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/user-agent-guide",
		"HreflangZH":  "https://toolboxnova.com/dev/user-agent-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/user-agent-guide?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"PageClass":   "page-dev-user-agent-guide",
		"ToolName":    "user-agent-guide",
	})
	renderDevTool(c, "dev/user-agent-guide.html", data)
}

// DevDiffPage serves /dev/diff - Text diff checker tool
func DevDiffPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.diff.title"),
		"Description": t("seo.diff.description"),
		"Keywords":    t("seo.diff.keywords"),
		"Canonical":   "https://toolboxnova.com/dev/diff",
		"HreflangZH":  "https://toolboxnova.com/dev/diff?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/dev/diff?lang=en",
		"OGImage":     "https://toolboxnova.com/static/img/og.png",
		"FAQs":        faq.DevFAQs(lang, "diff"),
		"PageClass":   "page-dev-diff",
		"ToolName":    "diff",
	})
	renderDevTool(c, "dev/diff.html", data)
}
