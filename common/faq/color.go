package faq

// ColorFAQs returns FAQs for color tools by language.
func ColorFAQs(lang string) []FAQ {
	if lang == "zh" {
		return []FAQ{
			{Q: "我的图片或颜色数据会上传到服务器吗？", A: "绝不会。所有颜色操作完全在您的浏览器中通过 JavaScript 运行，没有任何数据离开您的设备。您的图片和颜色选择 100% 私密。"},
			{Q: "支持哪些颜色格式？", A: "支持 HEX、RGB、HSL、HSV、CMYK、LAB、LCH、OKLCH、HWB 和 XYZ，可即时互转。其中 OKLCH 和 HWB 为 CSS Color Level 4 标准。"},
			{Q: "什么是 APCA 对比度算法？", A: "APCA（Accessible Perceptual Contrast Algorithm）是为 WCAG 3.0 开发的下一代对比度标准，比 WCAG 2.1 的简单比值提供更准确的可读性预测。"},
			{Q: "可以将调色板导出到 Figma 或 Tailwind 吗？", A: "当然！支持导出 CSS 变量、SCSS 变量、Tailwind 配置、JSON、ASE（Adobe 色板）、GPL（GIMP）、PNG 图片或 SVG 文件。"},
			{Q: "调色板生成器如何工作？", A: "按空格键根据色彩理论规则（互补色、三角色、类比色等）生成和谐调色板。锁定喜欢的颜色，继续生成直到找到完美组合，然后通过 URL 分享。"},
		}
	}
	return []FAQ{
		{Q: "Are my images or color data uploaded to a server?", A: "Never. All color operations run entirely in your browser using JavaScript. No data leaves your device — your images and color choices are 100% private."},
		{Q: "What color formats are supported?", A: "We support HEX, RGB, HSL, HSV, CMYK, LAB, LCH, OKLCH, HWB, and XYZ with instant conversion. OKLCH and HWB are CSS Color Level 4 standards."},
		{Q: "What is the APCA contrast algorithm?", A: "APCA (Accessible Perceptual Contrast Algorithm) is the next-generation standard being developed for WCAG 3.0. It provides more accurate readability predictions than the WCAG 2.1 contrast ratio."},
		{Q: "Can I export palettes for Figma or Tailwind?", A: "Yes! Export as CSS variables, SCSS variables, Tailwind config, JSON, ASE (Adobe Swatch Exchange), GPL (GIMP palette), PNG image, or SVG file — all free."},
		{Q: "How does the palette generator work?", A: "Press the spacebar to generate harmonious palettes based on color theory rules (complementary, triadic, analogous, etc.). Lock colors you like and keep generating until you find the perfect combination, then share via URL."},
	}
}
