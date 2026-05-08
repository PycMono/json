package ai

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"

	"github.com/gin-gonic/gin"
)

// SentenceRewriterPage renders the AI Sentence Rewriter page
func SentenceRewriterPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	canonical := "https://toolboxnova.com/ai/sentence-rewriter"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://toolboxnova.com/ai/sentence-rewriter?lang=%s", lang)
	}

	hreflang := map[string]string{
		"en":  "https://toolboxnova.com/ai/sentence-rewriter?lang=en",
		"zh":  "https://toolboxnova.com/ai/sentence-rewriter?lang=zh",
		"ja":  "https://toolboxnova.com/ai/sentence-rewriter?lang=ja",
		"ko":  "https://toolboxnova.com/ai/sentence-rewriter?lang=ko",
		"spa": "https://toolboxnova.com/ai/sentence-rewriter?lang=spa",
	}

	data := render.BaseData(c, gin.H{
		"Title":          t("sentence_rewriter.seo.title"),
		"Description":    t("sentence_rewriter.seo.desc"),
		"Keywords":       t("sentence_rewriter.seo.keywords"),
		"PageClass":      "page-ai-sentence-rewriter",
		"ActiveTool":     "ai-sentence-rewriter",
		"Canonical":      canonical,
		"HreflangMap":    hreflang,
		"SEOArticle":     template.HTML(t("sentence_rewriter.seo.article")),
		"OGImage":        "https://toolboxnova.com/static/img/og-sentence-rewriter.png",
		"FreeWordLimit":  15000,
		"CaptchaEnabled": false,
		"CaptchaSiteKey": "",
	})

	render.Render(c, "ailab/sentence-rewriter.html", data)
}
