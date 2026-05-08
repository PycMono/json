package image

import (
	"PycMono/github/json/infrastructure/controller/http/render"

	"github.com/gin-gonic/gin"
)

// ImgMetadataPage renders the image metadata viewer page
func ImgMetadataPage(c *gin.Context) {
	t := render.GetT(c)

	data := render.BaseData(c, gin.H{
		"Title":       t("img.metadata.seo.title"),
		"Description": t("img.metadata.seo.desc"),
		"Keywords":    "image metadata viewer,EXIF viewer,GPS photo location,IPTC copyright,XMP data,read image metadata online,photo location finder,camera data extractor,image privacy check,remove EXIF metadata",
		"PageClass":   "page-img-metadata",
		"CurrentTool": "metadata",
	})
	render.Render(c, "img_metadata.html", data)
}

// ImgMetadataGuidePage renders the image metadata guide page
func ImgMetadataGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("img.metadata.guide.seo.title"),
		"Description": t("img.metadata.guide.seo.desc"),
		"Keywords":    "image metadata guide,EXIF explained,GPS metadata privacy,remove EXIF data,IPTC vs XMP,image privacy check,photo metadata tutorial,what is EXIF data",
		"Canonical":   "https://toolboxnova.com/img/metadata-guide",
		"HreflangZH":  "https://toolboxnova.com/img/metadata-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/metadata-guide?lang=en",
		"PageClass":   "page-img-metadata-guide",
	})
	render.Render(c, "img/img-metadata-guide.html", data)
}
