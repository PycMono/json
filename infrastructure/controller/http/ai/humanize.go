package ai

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"

	"github.com/gin-gonic/gin"
)

// HumanizePage renders the unified AI Humanize page with tabs (Home, Humanizer, Detector)
func HumanizePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	// Get the active tab from query param (default: home)
	activeTab := c.DefaultQuery("tab", "home")
	if activeTab != "home" && activeTab != "humanizer" && activeTab != "detector" && activeTab != "plagiarism" {
		activeTab = "home"
	}

	canonical := "https://toolboxnova.com/ai/humanize"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://toolboxnova.com/ai/humanize?lang=%s", lang)
	}

	hreflang := map[string]string{
		"en":  "https://toolboxnova.com/ai/humanize?lang=en",
		"zh":  "https://toolboxnova.com/ai/humanize?lang=zh",
		"ja":  "https://toolboxnova.com/ai/humanize?lang=ja",
		"ko":  "https://toolboxnova.com/ai/humanize?lang=ko",
		"spa": "https://toolboxnova.com/ai/humanize?lang=spa",
	}

	data := render.BaseData(c, gin.H{
		"Title":          t("humanize.seo.title"),
		"Description":    t("humanize.seo.desc"),
		"Keywords":       t("humanize.seo.keywords"),
		"PageClass":      "page-ai-humanize",
		"ActiveTool":     "ai-humanize",
		"IsHubPage":      true,
		"Canonical":      canonical,
		"HreflangMap":    hreflang,
		"SEOArticle":     template.HTML(t("humanize.seo.article")),
		"OGImage":        "https://toolboxnova.com/static/img/og-humanize.png",
		"ActiveTab":      activeTab,
		"FreeWordLimit":  15000,
		"CaptchaEnabled": false,
		"CaptchaSiteKey": "",
	})

	render.Render(c, "ailab/humanize.html", data)
}
