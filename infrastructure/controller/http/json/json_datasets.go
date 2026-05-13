package json

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"

	"github.com/gin-gonic/gin"
)

// DatasetFAQItem holds a FAQ item
type DatasetFAQItem struct {
	Question string
	Answer   string
}

func getDatasetsFAQFromPkg(lang string) []DatasetFAQItem {
	faqs := faq.JSONDatasetsFAQs(lang)
	result := make([]DatasetFAQItem, len(faqs))
	for i, f := range faqs {
		result[i] = DatasetFAQItem{Question: f.Q, Answer: f.A}
	}
	return result
}

// JSONDatasetsPage renders the JSON datasets listing page
func JSONDatasetsPage(c *gin.Context) {
	lang := c.GetString("lang")
	if lang == "" {
		lang = "en"
	}
	t := render.GetT(c)

	data := render.BaseData(c, gin.H{
		"Title":        t("datasets.seo.title"),
		"Description":  t("datasets.seo.description"),
		"Keywords":     "json datasets, free json data, open source datasets, mock data, test data, json samples",
		"Lang":         lang,
		"FAQData":      getDatasetsFAQFromPkg(lang),
		"CanonicalURL": "https://ycjson.top/json/datasets",
		"HreflangEN":   "https://ycjson.top/json/datasets?lang=en",
		"HreflangZH":   "https://ycjson.top/json/datasets?lang=zh",
		"PageClass":    "page-json-datasets",
	})
	render.RenderJSONTool(c, "datasets.html", data)
}
