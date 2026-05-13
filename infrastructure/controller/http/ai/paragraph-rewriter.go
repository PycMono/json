package ai

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"

	"github.com/gin-gonic/gin"
)

// ParagraphRewriterPage renders the AI Paragraph Rewriter page
func ParagraphRewriterPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	canonical := "https://ycjson.top/ai/paragraph-rewriter"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://ycjson.top/ai/paragraph-rewriter?lang=%s", lang)
	}

	hreflang := map[string]string{
		"en":  "https://ycjson.top/ai/paragraph-rewriter?lang=en",
		"zh":  "https://ycjson.top/ai/paragraph-rewriter?lang=zh",
		"ja":  "https://ycjson.top/ai/paragraph-rewriter?lang=ja",
		"ko":  "https://ycjson.top/ai/paragraph-rewriter?lang=ko",
		"spa": "https://ycjson.top/ai/paragraph-rewriter?lang=spa",
	}

	data := render.BaseData(c, gin.H{
		"Title":          t("paragraph_rewriter.seo.title"),
		"Description":    t("paragraph_rewriter.seo.desc"),
		"Keywords":       t("paragraph_rewriter.seo.keywords"),
		"PageClass":      "page-ai-paragraph-rewriter",
		"ActiveTool":     "ai-paragraph-rewriter",
		"Canonical":      canonical,
		"HreflangMap":    hreflang,
		"SEOArticle":     template.HTML(t("paragraph_rewriter.seo.article")),
		"OGImage":        "https://ycjson.top/static/img/og-paragraph-rewriter.png",
		"FreeWordLimit":  15000,
		"CaptchaEnabled": false,
		"CaptchaSiteKey": "",
	})

	render.Render(c, "ailab/paragraph-rewriter.html", data)
}
