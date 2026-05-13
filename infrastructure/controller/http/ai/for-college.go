package ai

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"

	"github.com/gin-gonic/gin"
)

// ForCollegePage renders the AI Humanizer for College page
func ForCollegePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	canonical := "https://ycjson.top/ai/for-college"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://ycjson.top/ai/for-college?lang=%s", lang)
	}

	hreflang := map[string]string{
		"en":  "https://ycjson.top/ai/for-college?lang=en",
		"zh":  "https://ycjson.top/ai/for-college?lang=zh",
		"ja":  "https://ycjson.top/ai/for-college?lang=ja",
		"ko":  "https://ycjson.top/ai/for-college?lang=ko",
		"spa": "https://ycjson.top/ai/for-college?lang=spa",
	}

	data := render.BaseData(c, gin.H{
		"Title":          t("for_college.seo.title"),
		"Description":    t("for_college.seo.desc"),
		"Keywords":       t("for_college.seo.keywords"),
		"PageClass":      "page-ai-for-college",
		"ActiveTool":     "ai-for-college",
		"Canonical":      canonical,
		"HreflangMap":    hreflang,
		"SEOArticle":     template.HTML(t("for_college.seo.article")),
		"OGImage":        "https://ycjson.top/static/img/og-for-college.png",
		"FreeWordLimit":  15000,
		"CaptchaEnabled": false,
		"CaptchaSiteKey": "",
	})

	render.Render(c, "ailab/for-college.html", data)
}
