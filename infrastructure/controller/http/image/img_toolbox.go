package image

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"

	"github.com/gin-gonic/gin"
)

// ─── /img/crop ───────────────────────────────────────────────
func ImgCropPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "crop")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.crop.title"),
		"Description": t("seo.crop.description"),
		"Keywords":    t("seo.crop.keywords"),
		"PageClass":   "page-img-crop",
		"FAQs":        faqs,
		"CurrentTool": "crop",
		"Canonical":   "https://toolboxnova.com/img/crop",
		"HreflangZH":  "https://toolboxnova.com/img/crop?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/crop?lang=en",
	})
	render.Render(c, "img/crop.html", data)
}

// ─── /img/crop-guide ─────────────────────────────────────────
func ImgCropGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.crop_guide.title"),
		"Description": t("seo.crop_guide.description"),
		"Keywords":    t("seo.crop_guide.keywords"),
		"PageClass":   "page-img-crop-guide",
		"CurrentTool": "crop",
		"Canonical":   "https://toolboxnova.com/img/crop-guide",
		"HreflangZH":  "https://toolboxnova.com/img/crop-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/crop-guide?lang=en",
	})
	render.Render(c, "img/crop-guide.html", data)
}

// ─── /img/convert-to-jpg ─────────────────────────────────────
func ImgConvertToJpgPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "convert-to-jpg")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.to_jpg.title"),
		"Description": t("seo.to_jpg.description"),
		"Keywords":    t("seo.to_jpg.keywords"),
		"PageClass":   "page-img-to-jpg",
		"FAQs":        faqs,
		"CurrentTool": "to-jpg",
		"Canonical":   "https://toolboxnova.com/img/convert-to-jpg",
		"HreflangZH":  "https://toolboxnova.com/img/convert-to-jpg?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/convert-to-jpg?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/convert-to-jpg?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/convert-to-jpg?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/convert-to-jpg?lang=spa",
	})
	render.Render(c, "img/convert_to_jpg.html", data)
}

// ─── /img/convert-to-jpg-guide ───────────────────────────────
func ImgConvertToJpgGuidePage(c *gin.Context) {
	t := render.GetT(c)
	data := render.BaseData(c, gin.H{
		"Title":       t("seo.to_jpg_guide.title"),
		"Description": t("seo.to_jpg_guide.description"),
		"Keywords":    t("seo.to_jpg_guide.keywords"),
		"PageClass":   "page-img-to-jpg-guide",
		"CurrentTool": "to-jpg",
		"Canonical":   "https://toolboxnova.com/img/convert-to-jpg-guide",
		"HreflangZH":  "https://toolboxnova.com/img/convert-to-jpg-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/convert-to-jpg-guide?lang=en",
	})
	render.Render(c, "img/convert_to_jpg_guide.html", data)
}

// ─── /img/jpg-to-image ───────────────────────────────────────
func ImgJpgToImagePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "jpg-to-image")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.jpg_to.title"),
		"Description": t("seo.jpg_to.description"),
		"Keywords":    t("seo.jpg_to.keywords"),
		"PageClass":   "page-jpg-to-image",
		"FAQs":        faqs,
		"CurrentTool": "jpg-to",
		"Canonical":   "https://toolboxnova.com/img/jpg-to-image",
		"HreflangZH":  "https://toolboxnova.com/img/jpg-to-image?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/jpg-to-image?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/jpg-to-image?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/jpg-to-image?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/jpg-to-image?lang=spa",
	})
	render.Render(c, "img/jpg_to_image.html", data)
}

// ─── /img/jpg-to-image-guide ─────────────────────────────────
func ImgJpgToImageGuidePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "jpg-to-image-guide")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.jpg_to_guide.title"),
		"Description": t("seo.jpg_to_guide.description"),
		"Keywords":    t("seo.jpg_to_guide.keywords"),
		"PageClass":   "page-jpg-to-image-guide",
		"FAQs":        faqs,
		"CurrentTool": "jpg-to",
		"Canonical":   "https://toolboxnova.com/img/jpg-to-image-guide",
		"HreflangZH":  "https://toolboxnova.com/img/jpg-to-image-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/jpg-to-image-guide?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/jpg-to-image-guide?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/jpg-to-image-guide?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/jpg-to-image-guide?lang=spa",
	})
	render.Render(c, "img/jpg_to_image_guide.html", data)
}

// ─── /img/photo-editor ───────────────────────────────────────
func ImgPhotoEditorPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "photo-editor")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.editor.title"),
		"Description": t("seo.editor.description"),
		"Keywords":    t("seo.editor.keywords"),
		"PageClass":   "page-photo-editor",
		"FAQs":        faqs,
		"CurrentTool": "photo-editor",
		"Canonical":   "https://toolboxnova.com/img/photo-editor",
		"HreflangZH":  "https://toolboxnova.com/img/photo-editor?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/photo-editor?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/photo-editor?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/photo-editor?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/photo-editor?lang=spa",
	})
	render.Render(c, "img/photo_editor.html", data)
}

// ─── /img/photo-editor-guide ─────────────────────────────────
func ImgPhotoEditorGuidePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "photo-editor-guide")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.editor_guide.title"),
		"Description": t("seo.editor_guide.description"),
		"Keywords":    t("seo.editor_guide.keywords"),
		"PageClass":   "page-photo-editor-guide",
		"FAQs":        faqs,
		"CurrentTool": "photo-editor",
		"Canonical":   "https://toolboxnova.com/img/photo-editor-guide",
		"HreflangZH":  "https://toolboxnova.com/img/photo-editor-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/photo-editor-guide?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/photo-editor-guide?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/photo-editor-guide?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/photo-editor-guide?lang=spa",
	})
	render.Render(c, "img/photo_editor_guide.html", data)
}

// ─── /img/remove-bg ──────────────────────────────────────────
func ImgRemoveBgPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "remove-bg")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.remove_bg.title"),
		"Description": t("seo.remove_bg.description"),
		"Keywords":    t("seo.remove_bg.keywords"),
		"PageClass":   "page-remove-bg",
		"FAQs":        faqs,
		"CurrentTool": "remove-bg",
		"Canonical":   "https://toolboxnova.com/img/remove-bg",
		"HreflangZH":  "https://toolboxnova.com/img/remove-bg?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/remove-bg?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/remove-bg?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/remove-bg?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/remove-bg?lang=spa",
	})
	render.Render(c, "img/remove_bg.html", data)
}

// ─── /img/remove-bg-guide ────────────────────────────────────
func ImgRemoveBgGuidePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "remove-bg-guide")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.remove_bg_guide.title"),
		"Description": t("seo.remove_bg_guide.description"),
		"Keywords":    t("seo.remove_bg_guide.keywords"),
		"PageClass":   "page-remove-bg-guide",
		"FAQs":        faqs,
		"CurrentTool": "remove-bg",
		"Canonical":   "https://toolboxnova.com/img/remove-bg-guide",
		"HreflangZH":  "https://toolboxnova.com/img/remove-bg-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/remove-bg-guide?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/remove-bg-guide?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/remove-bg-guide?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/remove-bg-guide?lang=spa",
	})
	render.Render(c, "img/remove_bg_guide.html", data)
}

// ─── /img/watermark ──────────────────────────────────────────
func ImgWatermarkPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "watermark")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.watermark.title"),
		"Description": t("seo.watermark.description"),
		"Keywords":    t("seo.watermark.keywords"),
		"PageClass":   "page-watermark",
		"FAQs":        faqs,
		"CurrentTool": "watermark",
		"Canonical":   "https://toolboxnova.com/img/watermark",
		"HreflangZH":  "https://toolboxnova.com/img/watermark?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/watermark?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/watermark?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/watermark?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/watermark?lang=spa",
	})
	render.Render(c, "img/watermark.html", data)
}

// ─── /img/watermark-guide ────────────────────────────────────
func ImgWatermarkGuidePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "watermark-guide")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.watermark_guide.title"),
		"Description": t("seo.watermark_guide.description"),
		"Keywords":    t("seo.watermark_guide.keywords"),
		"PageClass":   "page-watermark-guide",
		"FAQs":        faqs,
		"CurrentTool": "watermark",
		"Canonical":   "https://toolboxnova.com/img/watermark-guide",
		"HreflangZH":  "https://toolboxnova.com/img/watermark-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/watermark-guide?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/watermark-guide?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/watermark-guide?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/watermark-guide?lang=spa",
	})
	render.Render(c, "img/watermark_guide.html", data)
}

// ─── /img/rotate ─────────────────────────────────────────────
func ImgRotatePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "rotate")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.rotate.title"),
		"Description": t("seo.rotate.description"),
		"Keywords":    t("seo.rotate.keywords"),
		"PageClass":   "page-rotate",
		"FAQs":        faqs,
		"CurrentTool": "rotate",
		"Canonical":   "https://toolboxnova.com/img/rotate",
		"HreflangZH":  "https://toolboxnova.com/img/rotate?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/rotate?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/rotate?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/rotate?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/rotate?lang=spa",
	})
	render.Render(c, "img/rotate.html", data)
}

// ─── /img/rotate-guide ───────────────────────────────────────
func ImgRotateGuidePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "rotate-guide")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.rotate_guide.title"),
		"Description": t("seo.rotate_guide.description"),
		"Keywords":    t("seo.rotate_guide.keywords"),
		"PageClass":   "page-rotate-guide",
		"FAQs":        faqs,
		"CurrentTool": "rotate",
		"Canonical":   "https://toolboxnova.com/img/rotate-guide",
		"HreflangZH":  "https://toolboxnova.com/img/rotate-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/rotate-guide?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/rotate-guide?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/rotate-guide?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/rotate-guide?lang=spa",
	})
	render.Render(c, "img/rotate_guide.html", data)
}

// ─── /img/ocr ────────────────────────────────────────────────
func ImgOCRPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "ocr")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.ocr.title"),
		"Description": t("seo.ocr.description"),
		"Keywords":    t("seo.ocr.keywords"),
		"PageClass":   "page-img-ocr",
		"FAQs":        faqs,
		"CurrentTool": "ocr",
	})
	render.Render(c, "img/ocr.html", data)
}

// ─── /img/ocr-guide ──────────────────────────────────────────
func ImgOCRGuidePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "ocr-guide")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.ocr_guide.title"),
		"Description": t("seo.ocr_guide.description"),
		"Keywords":    t("seo.ocr_guide.keywords"),
		"PageClass":   "page-img-ocr-guide",
		"FAQs":        faqs,
		"CurrentTool": "ocr",
		"Canonical":   "https://toolboxnova.com/img/ocr-guide",
		"HreflangZH":  "https://toolboxnova.com/img/ocr-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/ocr-guide?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/ocr-guide?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/ocr-guide?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/ocr-guide?lang=spa",
	})
	render.Render(c, "img/ocr_guide.html", data)
}

// ─── /img/to-video ───────────────────────────────────────────
func ImgToVideoPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "to-video")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.img_to_video.title"),
		"Description": t("seo.img_to_video.description"),
		"Keywords":    t("seo.img_to_video.keywords"),
		"PageClass":   "page-img-to-video",
		"FAQs":        faqs,
		"CurrentTool": "to-video",
		"Canonical":   "https://toolboxnova.com/img/to-video",
		"HreflangZH":  "https://toolboxnova.com/img/to-video?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/to-video?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/to-video?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/to-video?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/to-video?lang=spa",
	})
	render.Render(c, "img/to_video.html", data)
}

// ─── /img/to-video-guide ─────────────────────────────────────
func ImgToVideoGuidePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "to-video-guide")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.img_to_video_guide.title"),
		"Description": t("seo.img_to_video_guide.description"),
		"Keywords":    t("seo.img_to_video_guide.keywords"),
		"PageClass":   "page-img-to-video-guide",
		"FAQs":        faqs,
		"CurrentTool": "to-video",
		"Canonical":   "https://toolboxnova.com/img/to-video-guide",
		"HreflangZH":  "https://toolboxnova.com/img/to-video-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/to-video-guide?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/to-video-guide?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/to-video-guide?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/to-video-guide?lang=spa",
	})
	render.Render(c, "img/to_video_guide.html", data)
}

// ─── /img/to-pdf ─────────────────────────────────────────────
func ImgToPDFPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "to-pdf")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.img_to_pdf.title"),
		"Description": t("seo.img_to_pdf.description"),
		"Keywords":    t("seo.img_to_pdf.keywords"),
		"PageClass":   "page-img-to-pdf",
		"FAQs":        faqs,
		"CurrentTool": "to-pdf",
		"Canonical":   "https://toolboxnova.com/img/to-pdf",
		"HreflangZH":  "https://toolboxnova.com/img/to-pdf?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/to-pdf?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/to-pdf?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/to-pdf?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/to-pdf?lang=spa",
	})
	render.Render(c, "img/to_pdf.html", data)
}

// ─── /img/to-pdf-guide ───────────────────────────────────────
func ImgToPDFGuidePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	faqs := faq.ImgToolboxFAQs(lang, "to-pdf-guide")

	data := render.BaseData(c, gin.H{
		"Title":       t("seo.img_to_pdf_guide.title"),
		"Description": t("seo.img_to_pdf_guide.description"),
		"Keywords":    t("seo.img_to_pdf_guide.keywords"),
		"PageClass":   "page-img-to-pdf-guide",
		"FAQs":        faqs,
		"CurrentTool": "to-pdf",
		"Canonical":   "https://toolboxnova.com/img/to-pdf-guide",
		"HreflangZH":  "https://toolboxnova.com/img/to-pdf-guide?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/img/to-pdf-guide?lang=en",
		"HreflangJA":  "https://toolboxnova.com/img/to-pdf-guide?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/img/to-pdf-guide?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/img/to-pdf-guide?lang=spa",
	})
	render.Render(c, "img/to_pdf_guide.html", data)
}
