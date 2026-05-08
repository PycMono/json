package ai

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"

	"github.com/gin-gonic/gin"
)

// EssayPage renders the AI Essay Writer page
func EssayPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	canonical := "https://toolboxnova.com/ai/essay"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://toolboxnova.com/ai/essay?lang=%s", lang)
	}

	hreflang := map[string]string{
		"en":  "https://toolboxnova.com/ai/essay?lang=en",
		"zh":  "https://toolboxnova.com/ai/essay?lang=zh",
		"ja":  "https://toolboxnova.com/ai/essay?lang=ja",
		"ko":  "https://toolboxnova.com/ai/essay?lang=ko",
		"spa": "https://toolboxnova.com/ai/essay?lang=spa",
	}

	data := render.BaseData(c, gin.H{
		"Title":          t("essay.seo.title"),
		"Description":    t("essay.seo.desc"),
		"Keywords":       t("essay.seo.keywords"),
		"PageClass":      "page-ai-essay",
		"ActiveTool":     "ai-essay",
		"Canonical":      canonical,
		"HreflangMap":    hreflang,
		"SEOArticle":     template.HTML(t("essay.seo.article")),
		"OGImage":        "https://toolboxnova.com/static/img/og-essay.png",
		"FreeWordLimit":  15000,
		"CaptchaEnabled": false,
		"CaptchaSiteKey": "",
	})

	render.Render(c, "ailab/essay.html", data)
}
