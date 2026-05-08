package image

import (
	"PycMono/github/json/infrastructure/controller/http/render"

	"github.com/gin-gonic/gin"
)

// ImgCompressPage renders the image compression page
func ImgCompressPage(c *gin.Context) {
	t := render.GetT(c)

	data := render.BaseData(c, gin.H{
		"Title":       t("img.compress.seo.title"),
		"Description": t("img.compress.seo.desc"),
		"Keywords":    "image compressor, compress jpg online, compress png online, compress webp, batch image compress, reduce image size, optimize images, no upload, browser image compression, free image compressor",
		"PageClass":   "page-img-compress",
		"CurrentTool": "compress",
	})
	render.Render(c, "img_compress.html", data)
}

// ImgCompressGuidePage renders the image compression guide page
func ImgCompressGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("img.compress.guide.seo.title"),
		"Description": t("img.compress.guide.seo.desc"),
		"Keywords":    "image compression guide, compress images for web, optimize jpg png webp, reduce image file size, browser image compression tutorial",
		"Canonical":   "https://toolboxnova.com/img/compress-guide",
		"HreflangZH":  "https://toolboxnova.com/img/compress-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/compress-guide?lang=en",
		"PageClass":   "page-img-compress-guide",
	})
	render.Render(c, "img/img-compress-guide.html", data)
}
