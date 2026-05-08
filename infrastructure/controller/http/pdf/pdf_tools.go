package pdf

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"
	"github.com/gin-gonic/gin"
)

// pdfBase returns common base data for every PDF tool page
func pdfBase(c *gin.Context, tool string, extra gin.H) gin.H {
	t := render.GetT(c)
	lang := render.GetLang(c)
	faqs := faq.PDFFAQs(lang, tool)
	data := render.BaseData(c, gin.H{
		"PDFTool":     tool,
		"PageClass":   "page-pdf-tool page-pdf-" + tool,
		"Title":       t("seo.pdf." + tool + ".title"),
		"Description": t("seo.pdf." + tool + ".description"),
		"Keywords":    t("seo.pdf." + tool + ".keywords"),
		"FAQs":        faqs,
	})
	for k, v := range extra {
		data[k] = v
	}
	return data
}

func ReorderPage(c *gin.Context) {
	render.RenderPDFTool(c, "pdf/reorder.html", pdfBase(c, "reorder", nil))
}

func ExtractTextPage(c *gin.Context) {
	render.RenderPDFTool(c, "pdf/extract_text.html", pdfBase(c, "extract-text", nil))
}

func MergePage(c *gin.Context) {
	render.RenderPDFTool(c, "pdf/merge.html", pdfBase(c, "merge", nil))
}

func SplitPage(c *gin.Context) {
	render.RenderPDFTool(c, "pdf/split.html", pdfBase(c, "split", nil))
}

func ToImagePage(c *gin.Context) {
	render.RenderPDFTool(c, "pdf/to_image.html", pdfBase(c, "to-image", nil))
}

func WatermarkPage(c *gin.Context) {
	render.RenderPDFTool(c, "pdf/watermark.html", pdfBase(c, "watermark", nil))
}

func EncryptPage(c *gin.Context) {
	render.RenderPDFTool(c, "pdf/encrypt.html", pdfBase(c, "encrypt", nil))
}

func CompressPage(c *gin.Context) {
	render.RenderPDFTool(c, "pdf/compress.html", pdfBase(c, "compress", nil))
}
