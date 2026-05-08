package weather

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"

	"github.com/gin-gonic/gin"
)

// QueryFAQ holds a single FAQ entry
type QueryFAQ = faq.FAQ

// QueryPage Renders the weather query tool page
func QueryPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.WeatherFAQs(t)

	canonical := "https://toolboxnova.com/weather/query"
	hreflangZH := "https://toolboxnova.com/weather/query?lang=zh"
	hreflangEN := "https://toolboxnova.com/weather/query?lang=en"
	if lang != "en" && lang != "" {
		canonical = fmt.Sprintf("https://toolboxnova.com/weather/query?lang=%s", lang)
	}

	// JSON-LD structured data
	jsonld := fmt.Sprintf(`{
  "@context":"https://schema.org",
  "@type":"SoftwareApplication",
  "name":"%s",
  "description":"%s",
  "url":"https://toolboxnova.com/weather/query",
  "applicationCategory":"UtilitiesApplication",
  "operatingSystem":"Web",
  "offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},
  "provider":{"@type":"Organization","name":"json","url":"https://toolboxnova.com"}
}`, t("wq.seo.title"), t("wq.seo.description"))

	data := render.BaseData(c, gin.H{
		"Title":       t("wq.seo.title"),
		"Description": t("wq.seo.description"),
		"Keywords":    t("wq.seo.keywords"),
		"OGTitle":     t("wq.seo.og_title"),
		"OGDesc":      t("wq.seo.og_description"),
		"PageClass":   "page-weather-query",
		"ActiveTool":  "weather-query",
		"Canonical":   canonical,
		"HreflangZH":  hreflangZH,
		"HreflangEN":  hreflangEN,
		"JSONLD":      jsonld,
		"FAQs":        faqs,
		"DefaultCity": "Beijing",
	})

	render.Render(c, "weather/query.html", data)
}
