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

	titleMap := map[string]string{
		"zh": "免费 JSON 数据集 — 85+ 开源合集 | json",
		"en": "Free JSON Datasets — 85+ Open Source Collections | json",
	}
	descMap := map[string]string{
		"zh": "下载 85+ 个免费开源 JSON 数据集，涵盖国家、货币、HTTP 状态码、Mock API、金融、AI 模型、物联网等，无需注册，即可使用。",
		"en": "Download 85+ free, open-source JSON datasets for testing, development, and learning. Covers countries, currencies, HTTP codes, mock APIs, finance, AI models, IoT, and more.",
	}

	data := render.BaseData(c, gin.H{
		"Title":        titleMap[lang],
		"Description":  descMap[lang],
		"Keywords":     "json datasets, free json data, open source datasets, mock data, test data, json samples",
		"Lang":         lang,
		"T":            t,
		"FAQData":      getDatasetsFAQFromPkg(lang),
		"CanonicalURL": "https://toolboxnova.com/json/datasets",
		"HreflangEN":   "https://toolboxnova.com/json/datasets?lang=en",
		"HreflangZH":   "https://toolboxnova.com/json/datasets?lang=zh",
		"PageClass":    "page-json-datasets",
	})
	render.RenderJSONTool(c, "datasets.html", data)
}
