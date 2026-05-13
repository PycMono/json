package ai

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"

	"github.com/gin-gonic/gin"
)

// DetectorAcademicPage renders the AI Detector for Academic Writing page
func DetectorAcademicPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	canonical := "https://ycjson.top/ai/detector/for-academic-writing"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://ycjson.top/ai/detector/for-academic-writing?lang=%s", lang)
	}

	hreflang := map[string]string{
		"en":  "https://ycjson.top/ai/detector/for-academic-writing?lang=en",
		"zh":  "https://ycjson.top/ai/detector/for-academic-writing?lang=zh",
		"ja":  "https://ycjson.top/ai/detector/for-academic-writing?lang=ja",
		"ko":  "https://ycjson.top/ai/detector/for-academic-writing?lang=ko",
		"spa": "https://ycjson.top/ai/detector/for-academic-writing?lang=spa",
	}

	data := render.BaseData(c, gin.H{
		"Title":          t("detector_academic.seo.title"),
		"Description":    t("detector_academic.seo.desc"),
		"Keywords":       t("detector_academic.seo.keywords"),
		"PageClass":      "page-ai-detector-academic",
		"ActiveTool":     "ai-detector-academic",
		"Canonical":      canonical,
		"HreflangMap":    hreflang,
		"SEOArticle":     template.HTML(t("detector_academic.seo.article")),
		"OGImage":        "https://ycjson.top/static/img/og-detector-academic.png",
		"FreeWordLimit":  15000,
		"CaptchaEnabled": false,
		"CaptchaSiteKey": "",
	})

	render.Render(c, "ailab/detector-academic.html", data)
}
