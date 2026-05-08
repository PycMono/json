package qrcode

import (
	"PycMono/github/json/infrastructure/controller/http/render"

	"github.com/gin-gonic/gin"
)

// QRPage renders the QR code generator page
func QRPage(c *gin.Context) {
	t := render.GetT(c)

	// Default type from query param
	qrType := c.DefaultQuery("type", "url")
	validTypes := map[string]bool{
		"url": true, "vcard": true, "text": true, "sms": true,
		"email": true, "wifi": true, "phone": true, "location": true, "calendar": true,
	}
	if !validTypes[qrType] {
		qrType = "url"
	}

	data := render.BaseData(c, gin.H{
		"Title":       t("qr.seo.title") + " | Tool Box Nova",
		"Description": t("qr.seo.desc"),
		"Keywords":    t("qr.seo.keywords"),
		"PageClass":   "page-qr",
		"CurrentType": qrType,
		"CurrentTool": "qr",
	})
	render.Render(c, "media/qr.html", data)
}

// QRGeneratorPage is an alias for QRPage (for legacy route compatibility)
func QRGeneratorPage(c *gin.Context) {
	QRPage(c)
}

// QRGuidePage renders the QR code generator SEO guide page
func QRGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("qr.guide.seo.title") + " | Tool Box Nova",
		"Description": t("qr.guide.seo.desc"),
		"Keywords":    t("qr.guide.seo.keywords"),
		"PageClass":   "page-qr-guide",
		"CurrentTool": "qr",
	})
	render.Render(c, "media/qr-guide.html", data)
}
