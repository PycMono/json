package ai

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"

	"github.com/gin-gonic/gin"
)

// ForProfessorsPage renders the AI Humanizer for Professors page
func ForProfessorsPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	canonical := "https://ycjson.top/ai/for-professors"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://ycjson.top/ai/for-professors?lang=%s", lang)
	}

	hreflang := map[string]string{
		"en":  "https://ycjson.top/ai/for-professors?lang=en",
		"zh":  "https://ycjson.top/ai/for-professors?lang=zh",
		"ja":  "https://ycjson.top/ai/for-professors?lang=ja",
		"ko":  "https://ycjson.top/ai/for-professors?lang=ko",
		"spa": "https://ycjson.top/ai/for-professors?lang=spa",
	}

	data := render.BaseData(c, gin.H{
		"Title":          t("for_professors.seo.title"),
		"Description":    t("for_professors.seo.desc"),
		"Keywords":       t("for_professors.seo.keywords"),
		"PageClass":      "page-ai-for-professors",
		"ActiveTool":     "ai-for-professors",
		"Canonical":      canonical,
		"HreflangMap":    hreflang,
		"SEOArticle":     template.HTML(t("for_professors.seo.article")),
		"OGImage":        "https://ycjson.top/static/img/og-for-professors.png",
		"FreeWordLimit":  15000,
		"CaptchaEnabled": false,
		"CaptchaSiteKey": "",
	})

	render.Render(c, "ailab/for-professors.html", data)
}
