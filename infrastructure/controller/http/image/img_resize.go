package image

import (
	"PycMono/github/json/infrastructure/controller/http/render"

	"github.com/gin-gonic/gin"
)

// ImgResizePage renders the image resize page
func ImgResizePage(c *gin.Context) {
	t := render.GetT(c)

	data := render.BaseData(c, gin.H{
		"Title":       t("img.resize.seo.title"),
		"Description": t("img.resize.seo.desc"),
		"Keywords":    "image resizer,resize image online,resize jpg,resize png,resize webp,social media image sizes,instagram resize,facebook resize,twitter resize,batch image resize,free image resizer,browser image resize,no upload,image format converter,aspect ratio resize,percentage resize,tiktok resize,youtube resize,linkedin resize,pinterest resize,webp converter",
		"PageClass":   "page-img-resize",
		"CurrentTool": "resize",
	})
	render.Render(c, "img_resize.html", data)
}

// ImgResizeGuidePage renders the image resize guide page
func ImgResizeGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("img.resize.guide.seo.title"),
		"Description": t("img.resize.guide.seo.desc"),
		"Keywords":    "image resize guide,resize images for web,social media image sizes,instagram image size,facebook image size,youtube thumbnail size,image dimensions guide,how to resize images,image aspect ratio,crop focus",
		"Canonical":   "https://toolboxnova.com/img/resize-guide",
		"HreflangZH":  "https://toolboxnova.com/img/resize-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/resize-guide?lang=en",
		"PageClass":   "page-img-resize-guide",
	})
	render.Render(c, "img/img-resize-guide.html", data)
}
