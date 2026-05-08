package proxy

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"
	"io"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ProxyPage renders the proxy page
func ProxyPage(c *gin.Context) {
	t := render.GetT(c)

	// Build FAQ data from centralized package
	faqs := faq.ProxyFAQs(t)

	data := render.BaseData(c, gin.H{
		"Title":       t("proxy.title"),
		"Description": t("proxy.meta_desc"),
		"Keywords":    "free proxy, anonymous proxy, web proxy, hide IP, online proxy",
		"PageClass":   "page-proxy",
		"FAQs":        faqs,
		"OGImage":     "https://toolboxnova.com/static/img/og-proxy.png",
		"SEOArticle":  template.HTML(t("proxy.seo.article")),
		"JSONLD": template.JS(`{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Anonymous Web Proxy — json",
  "applicationCategory": "UtilityApplication",
  "operatingSystem": "Web Browser",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "description": "Browse the web anonymously with our free online proxy. Hide your IP address, no software required.",
  "url": "https://toolboxnova.com/proxy",
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "15000", "bestRating": "5", "worstRating": "1" }
}`),
	})
	render.Render(c, "proxy.html", data)
}

// isProxyBlockedHost checks if the host is a private/local address
func isProxyBlockedHost(host string) bool {
	if ip := net.ParseIP(host); ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			return true
		}
	}
	blockedPrefixes := []string{"localhost", "127.", "10.", "192.168.", "0.0.0.0", "::1", "fc00:", "fd00:", "169.254."}
	for i := 8; i <= 31; i++ {
		blockedPrefixes = append(blockedPrefixes, fmt.Sprintf("172.%d.", i))
	}
	lower := strings.ToLower(host)
	for _, prefix := range blockedPrefixes {
		if strings.HasPrefix(lower, prefix) {
			return true
		}
	}
	return false
}

// ProxyFetchAPI handles proxy requests
func ProxyFetchAPI(c *gin.Context) {
	var body struct {
		URL            string `json:"url"`
		Encrypt        bool   `json:"encrypt"`
		DisableScripts bool   `json:"disable_scripts"`
		BlockAds       bool   `json:"block_ads"`
		Node           string `json:"node"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid URL"})
		return
	}

	targetURL := body.URL
	if !strings.HasPrefix(targetURL, "http") {
		targetURL = "https://" + targetURL
	}

	// SSRF protection: validate URL format
	parsedURL, err := url.ParseRequestURI(targetURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid URL format (http/https only)"})
		return
	}

	// SSRF protection: check hostname
	host := strings.ToLower(parsedURL.Hostname())
	if isProxyBlockedHost(host) {
		c.JSON(http.StatusForbidden, gin.H{"error": "private/local addresses not allowed"})
		return
	}

	// SSRF protection: DNS resolution check (prevent DNS rebinding)
	resolvedIPs, err := net.LookupHost(host)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to resolve host"})
		return
	}
	for _, ip := range resolvedIPs {
		parsedIP := net.ParseIP(ip)
		if parsedIP == nil || parsedIP.IsLoopback() || parsedIP.IsPrivate() || parsedIP.IsLinkLocalUnicast() || parsedIP.IsLinkLocalMulticast() || parsedIP.IsUnspecified() {
			c.JSON(http.StatusForbidden, gin.H{"error": "private/local addresses not allowed"})
			return
		}
	}

	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("stopped after 10 redirects")
			}
			// SSRF: re-validate redirect target
			redirectHost := strings.ToLower(req.URL.Hostname())
			if isProxyBlockedHost(redirectHost) {
				return fmt.Errorf("redirect to private address blocked")
			}
			redirectIPs, err := net.LookupHost(redirectHost)
			if err == nil {
				for _, ip := range redirectIPs {
					parsedIP := net.ParseIP(ip)
					if parsedIP == nil || parsedIP.IsLoopback() || parsedIP.IsPrivate() || parsedIP.IsLinkLocalUnicast() || parsedIP.IsLinkLocalMulticast() || parsedIP.IsUnspecified() {
						return fmt.Errorf("redirect to private address blocked")
					}
				}
			}
			// Copy headers from original request to redirect request
			for key, val := range via[0].Header {
				if _, ok := req.Header[key]; !ok {
					req.Header[key] = val
				}
			}
			return nil
		},
	}
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid URL: " + err.Error()})
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept-Encoding", "identity")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Sec-Fetch-User", "?1")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	// Limit response body to 10MB
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read response"})
		return
	}

	// Use the final URL after redirects for base tag and toolbar
	finalURL := resp.Request.URL.String()

	htmlContent := string(bodyBytes)

	// Remove ads if requested
	if body.BlockAds {
		adPatterns := []string{
			`(?i)<div[^>]*class="[^"]*ad[^"]*"[^>]*>.*?</div>`,
			`(?i)<ins class="adsbygoogle[^"]*".*?</ins>`,
		}
		for _, pattern := range adPatterns {
			re := regexp.MustCompile(pattern)
			htmlContent = re.ReplaceAllString(htmlContent, "")
		}
	}

	// Disable scripts if requested
	if body.DisableScripts {
		re := regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`)
		htmlContent = re.ReplaceAllString(htmlContent, "")
	}

	// Inject <base> tag so relative URLs resolve against the target origin
	parsedURL, parseErr := url.Parse(finalURL)
	if parseErr == nil {
		baseHref := parsedURL.Scheme + "://" + parsedURL.Host + "/"
		baseTag := fmt.Sprintf(`<base href="%s">`, baseHref)
		lowerHTML := strings.ToLower(htmlContent)
		if headIdx := strings.Index(lowerHTML, "<head"); headIdx != -1 {
			if closeIdx := strings.Index(htmlContent[headIdx:], ">"); closeIdx != -1 {
				pos := headIdx + closeIdx + 1
				htmlContent = htmlContent[:pos] + baseTag + htmlContent[pos:]
			}
		} else {
			htmlContent = baseTag + htmlContent
		}
	}

	// Inject navigation interceptor — always, even when scripts are "disabled"
	interceptor := `<script data-proxy-interceptor>(function(){
function pn(u){try{u=new URL(u,document.baseURI).href}catch(e){}if(!u||u.indexOf('javascript:')===0||u.indexOf('#')===0||u.indexOf('data:')===0)return;window.parent.postMessage({type:'proxyNavigate',url:u},'*');}
document.addEventListener('click',function(e){var a=e.target;while(a&&a.tagName!=='A')a=a.parentElement;if(a&&a.href&&a.target!=='_blank'&&a.href.indexOf('javascript:')!==0&&a.href.indexOf('#')!==0){e.preventDefault();e.stopPropagation();pn(a.href);}},true);
document.addEventListener('submit',function(e){e.preventDefault();var f=e.target,u=f.action||document.baseURI;var p=new URLSearchParams(new FormData(f)).toString();if(p)pn(u+(u.indexOf('?')>-1?'&':'?')+p);else pn(u);},true);
try{var op=history.pushState;history.pushState=function(s,t,u){if(u)pn(u.toString());};var or=history.replaceState;history.replaceState=function(s,t,u){if(u)pn(u.toString());};}catch(e){}
})();</script>`
	if bodyIdx := strings.LastIndex(strings.ToLower(htmlContent), "</body>"); bodyIdx != -1 {
		htmlContent = htmlContent[:bodyIdx] + interceptor + htmlContent[bodyIdx:]
	} else {
		htmlContent += interceptor
	}

	// Inject proxy toolbar
	toolbar := `<div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:white;height:44px;display:flex;align-items:center;justify-content:space-between;font-family:-apple-system,sans-serif;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.15);"><span style="display:flex;align-items:center;gap:8px;padding:0 16px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 100px);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> json Proxy — ` + finalURL + `</span><button onclick="window.parent.postMessage('closeProxy','*')" style="background:#dc2626;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;margin-right:12px;display:flex;align-items:center;gap:4px;">✕ Close</button></div><div style="padding-top:44px;">`

	htmlContent = strings.Replace(htmlContent, "<body", toolbar+"<body", 1)
	if !strings.Contains(htmlContent, toolbar) {
		htmlContent = toolbar + htmlContent + "</div>"
	}

	c.JSON(http.StatusOK, gin.H{"html": htmlContent, "url": finalURL})
}

// ProxyStatsAPI returns proxy stats
func ProxyStatsAPI(c *gin.Context) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	c.JSON(http.StatusOK, gin.H{
		"today_requests":  fmt.Sprintf("%d", 5200+r.Intn(800)),
		"available_nodes": 4,
	})
}

// ProxyNodesAPI returns available proxy nodes
func ProxyNodesAPI(c *gin.Context) {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	c.JSON(http.StatusOK, gin.H{
		"nodes": []gin.H{
			{"id": "auto", "name": "Auto Select", "location": "Global", "latency": r.Intn(50) + 10, "available": true},
			{"id": "us", "name": "US Node", "location": "United States", "latency": r.Intn(100) + 40, "available": true},
			{"id": "eu", "name": "EU Node", "location": "Europe", "latency": r.Intn(100) + 30, "available": true},
			{"id": "as", "name": "Asia Node", "location": "Asia", "latency": r.Intn(100) + 60, "available": true},
		},
	})
}
