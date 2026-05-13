package ai

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"html/template"

	"github.com/gin-gonic/gin"
)

// ArticleRewriterPage renders the AI Article Rewriter page
func ArticleRewriterPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	canonical := "https://ycjson.top/ai/article-rewriter"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://ycjson.top/ai/article-rewriter?lang=%s", lang)
	}

	hreflang := map[string]string{
		"en":  "https://ycjson.top/ai/article-rewriter?lang=en",
		"zh":  "https://ycjson.top/ai/article-rewriter?lang=zh",
		"ja":  "https://ycjson.top/ai/article-rewriter?lang=ja",
		"ko":  "https://ycjson.top/ai/article-rewriter?lang=ko",
		"spa": "https://ycjson.top/ai/article-rewriter?lang=spa",
	}

	data := render.BaseData(c, gin.H{
		"Title":          t("article_rewriter.seo.title"),
		"Description":    t("article_rewriter.seo.desc"),
		"Keywords":       t("article_rewriter.seo.keywords"),
		"PageClass":      "page-ai-article-rewriter",
		"ActiveTool":     "ai-article-rewriter",
		"Canonical":      canonical,
		"HreflangMap":    hreflang,
		"SEOArticle":     template.HTML(t("article_rewriter.seo.article")),
		"OGImage":        "https://ycjson.top/static/img/og-article-rewriter.png",
		"FreeWordLimit":  15000,
		"CaptchaEnabled": false,
		"CaptchaSiteKey": "",
	})

	render.Render(c, "ailab/article-rewriter.html", data)
}
