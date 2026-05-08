package json

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"
	"html/template"
	"strings"

	"github.com/gin-gonic/gin"
)

// JSONToolPage Renders the JSON toolkit page (handles all /tools/json/* sub-routes)
func JSONToolPage(c *gin.Context) {
	t := render.GetT(c)
	lang := c.GetString("lang")

	// Determine active tab from path
	path := c.Request.URL.Path
	activeTab := "format"
	switch {
	case strings.HasSuffix(path, "/escape"):
		activeTab = "escape"
	case strings.HasSuffix(path, "/unescape"):
		activeTab = "unescape"
	case strings.HasSuffix(path, "/repair"):
		activeTab = "repair"
	case strings.HasSuffix(path, "/minify"):
		activeTab = "minify"
	case strings.HasSuffix(path, "/diff"):
		activeTab = "diff"
	case strings.HasSuffix(path, "/tree"):
		activeTab = "tree"
	case strings.HasSuffix(path, "/path"):
		activeTab = "path"
	case strings.HasSuffix(path, "/csv"):
		activeTab = "csv"
	case strings.HasSuffix(path, "/yaml"):
		activeTab = "yaml"
	case strings.HasSuffix(path, "/schema"):
		activeTab = "schema"
	case strings.HasSuffix(path, "/jwt"):
		activeTab = "jwt"
	}

	// Support URL parameters for preset JSON (compatible with jsonlint.com)
	presetJSON := c.Query("json")
	presetURL := c.Query("url")

	data := render.BaseData(c, gin.H{
		"Title":       t("tools.json.seo.title"),
		"Description": t("tools.json.seo.desc"),
		"Keywords":    "json validator, json formatter, json lint, json beautifier, json minifier, online json tool, json checker, json pretty print, jsonlint, validate json online",
		"PageClass":   "page-json-tool",
		"ActiveTab":   activeTab,
		"PresetJSON":  presetJSON,
		"PresetURL":   presetURL,
		"FAQs":        faq.JSONToolFAQs(lang),
		"Canonical":   "https://toolboxnova.com/tools/json",
		"HreflangZH":  "https://toolboxnova.com/tools/json?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/tools/json?lang=en",
		"SEOArticle":  template.HTML(t("tools.json.seo.article")),
	})
	render.Render(c, "tools_json.html", data)
}

// RegexToolPage Renders the regex tester page
func RegexToolPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("tools.regex.seo.title"),
		"Description": t("tools.regex.seo.description"),
		"Keywords":    t("tools.regex.seo.keywords"),
		"Canonical":   "https://toolboxnova.com/tools/regex",
		"HreflangZH":  "https://toolboxnova.com/tools/regex?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/tools/regex?lang=en",
		"PageClass":   "page-regex-tool",
		"FAQs":        faq.JSONSubToolFAQs(lang, "regex"),
		"SEOArticle":  template.HTML(t("tools.regex.seo.article")),
	})
	render.Render(c, "tools_regex.html", data)
}

// MarkdownToolPage Renders the Markdown editor page
func MarkdownToolPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("tools.markdown.seo.title"),
		"Description": t("tools.markdown.seo.description"),
		"Keywords":    t("tools.markdown.seo.keywords"),
		"Canonical":   "https://toolboxnova.com/tools/markdown",
		"HreflangZH":  "https://toolboxnova.com/tools/markdown?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/tools/markdown?lang=en",
		"PageClass":   "page-markdown-tool",
		"FAQs":        faq.JSONSubToolFAQs(lang, "markdown"),
		"SEOArticle":  template.HTML(t("tools.markdown.seo.article")),
	})
	render.Render(c, "tools_markdown.html", data)
}

// TimestampToolPage Renders the timestamp converter page
func TimestampToolPage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("tools.timestamp.seo.title"),
		"Description": t("tools.timestamp.seo.description"),
		"Keywords":    t("tools.timestamp.seo.keywords"),
		"Canonical":   "https://toolboxnova.com/tools/timestamp",
		"HreflangZH":  "https://toolboxnova.com/tools/timestamp?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/tools/timestamp?lang=en",
		"PageClass":   "page-timestamp-tool",
		"SEOArticle":  template.HTML(t("tools.timestamp.seo.article")),
	})
	render.Render(c, "tools_timestamp.html", data)
}

// TimestampGuidePage Renders the timestamp guide / SEO page
func TimestampGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("tools.timestamp-guide.seo.title"),
		"Description": t("tools.timestamp-guide.seo.description"),
		"Keywords":    t("tools.timestamp-guide.seo.keywords"),
		"Canonical":   "https://toolboxnova.com/tools/timestamp-guide",
		"HreflangZH":  "https://toolboxnova.com/tools/timestamp-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/tools/timestamp-guide?lang=en",
		"PageClass":   "page-timestamp-guide",
	})
	render.Render(c, "tools_timestamp_guide.html", data)
}

// BaseConverterPage Renders the number base converter page
func BaseConverterPage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("tools.base.seo.title"),
		"Description": t("tools.base.seo.description"),
		"Keywords":    t("tools.base.seo.keywords"),
		"Canonical":   "https://toolboxnova.com/tools/base-converter",
		"HreflangZH":  "https://toolboxnova.com/tools/base-converter?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/tools/base-converter?lang=en",
		"PageClass":   "page-base-converter",
		"SEOArticle":  template.HTML(t("tools.base.seo.article")),
	})
	render.Render(c, "tools_base.html", data)
}

// BaseConverterGuidePage Renders the base converter guide / SEO page
func BaseConverterGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("tools.base-guide.seo.title"),
		"Description": t("tools.base-guide.seo.description"),
		"Keywords":    t("tools.base-guide.seo.keywords"),
		"Canonical":   "https://toolboxnova.com/tools/base-converter-guide",
		"HreflangZH":  "https://toolboxnova.com/tools/base-converter-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/tools/base-converter-guide?lang=en",
		"PageClass":   "page-base-converter-guide",
	})
	render.Render(c, "tools_base_guide.html", data)
}

// CaseConverterPage Renders the text case converter page
func CaseConverterPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("tools.case.seo.title"),
		"Description": t("tools.case.seo.description"),
		"Keywords":    t("tools.case.seo.keywords"),
		"Canonical":   "https://toolboxnova.com/tools/case-converter",
		"HreflangZH":  "https://toolboxnova.com/tools/case-converter?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/tools/case-converter?lang=en",
		"PageClass":   "page-case-converter",
		"FAQs":        faq.JSONSubToolFAQs(lang, "case"),
		"SEOArticle":  template.HTML(t("tools.case.seo.article")),
	})
	render.Render(c, "tools_case.html", data)
}

// MediaToolsPage Renders the media tools navigation page
func MediaToolsPage(c *gin.Context) {
	data := render.BaseData(c, gin.H{
		"Title":       "Free Online Media Tools - Image Compress, Video Convert, Color | json",
		"Description": "Free online media tools. Compress images, convert video formats, color picker, unit converter, QR code generator and more.",
		"Keywords":    "image compressor, video converter, color picker, qr code generator, unit converter",
		"PageClass":   "page-media-tools",
	})
	render.Render(c, "tools_media.html", data)
}

// ImageCompressPage Renders the image compression tool
func ImageCompressPage(c *gin.Context) {
	data := render.BaseData(c, gin.H{
		"Title":       "Free Image Compressor Online - Compress JPG PNG | json",
		"Description": "Compress images online for free. Reduce JPG, PNG, WEBP file size without visible quality loss. No upload limit, batch compress up to 20 images.",
		"Keywords":    "image compressor, compress jpg, compress png, reduce image size, optimize images",
		"PageClass":   "page-image-compress",
	})
	render.Render(c, "tools_media_image_compress.html", data)
}

// ColorConverterPage Renders the color converter tool
func ColorConverterPage(c *gin.Context) {
	data := render.BaseData(c, gin.H{
		"Title":       "Color Converter - HEX RGB HSL CMYK Online | json",
		"Description": "Convert colors between HEX, RGB, HSL, HSV, CMYK formats. Color picker with contrast checker and WCAG compliance validator.",
		"Keywords":    "color converter, hex to rgb, rgb to hsl, color picker, wcag contrast checker",
		"PageClass":   "page-color-converter",
	})
	render.Render(c, "tools_media_color.html", data)
}

// UnitConverterPage Renders the unit converter tool
func UnitConverterPage(c *gin.Context) {
	data := render.BaseData(c, gin.H{
		"Title":       "Unit Converter - Length, Weight, Temperature Online | json",
		"Description": "Convert units of length, weight, temperature, area, volume, speed, time, data, pressure, energy, frequency and more.",
		"Keywords":    "unit converter, length converter, temperature converter, weight converter, convert units",
		"PageClass":   "page-unit-converter",
	})
	render.Render(c, "tools_media_unit.html", data)
}

//// QRGeneratorPage Renders the QR code generator tool
//func QRGeneratorPage(c *gin.Context) {
//	data := BaseData(c, gin.H{
//		"Title":       "QR Code Generator Free - Custom QR Codes Online | json",
//		"Description": "Generate free QR codes for URLs, text, WiFi, email, vCard. Customize colors, size, and add logo. Download PNG or SVG.",
//		"Keywords":    "qr code generator, create qr code, custom qr code, qr code maker, generate qr code free",
//		"PageClass":   "page-qr-generator",
//	})
//	Render(c, "tools_media_qr.html", data)
//}
