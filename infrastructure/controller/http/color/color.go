package color

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"

	"github.com/gin-gonic/gin"
)

// colorSEO returns SEO data for a given color sub-tool and language.
func colorSEO(tool, lang string) map[string]string {
	type entry struct{ en, zh string }
	data := map[string]map[string]entry{
		"tools": {
			"title":       {"Free Online Color Tools — Picker, Palette, Wheel, Converter & More | json", "免费在线颜色工具 — 拾色器、调色板、色轮、转换器等 | json"},
			"description": {"The ultimate free color toolkit. Pick colors, generate palettes, check contrast, create gradients, extract from images — 100% browser-based.", "最全面的免费颜色工具套件。拾取颜色、生成调色板、检查对比度——全部在浏览器中完成，零上传。"},
			"keywords":    {"color picker, palette generator, color wheel, hex to rgb, contrast checker, gradient generator, tailwind colors", "拾色器,调色板生成器,色轮,HEX转RGB,对比度检查,渐变生成器,Tailwind颜色"},
			"ogTitle":     {"Color Tools Suite — 12 Professional Color Tools in One Place", "颜色工具套件 — 12 个专业颜色工具集于一体"},
			"ogDesc":      {"Pick, generate, convert, check and export colors. 100% free, 100% private, 100% browser-based.", "拾取、生成、转换、检查和导出颜色。100% 免费、100% 隐私、100% 浏览器端处理。"},
			"canonical":   {"https://ycjson.top/color/tools", "https://ycjson.top/color/tools?lang=zh"},
		},
		"picker": {
			"title":       {"Free Color Picker — HEX, RGB, HSL, OKLCH, LAB & 10 Formats | json", "免费拾色器 — HEX、RGB、HSL、OKLCH、LAB 等10种格式 | json"},
			"description": {"Pick any color and instantly get its value in HEX, RGB, HSL, HSV, CMYK, LAB, LCH, OKLCH, HWB and XYZ. Free, no signup.", "拾取任何颜色，即时获取 HEX、RGB、HSL、HSV、CMYK、LAB、LCH、OKLCH、HWB 和 XYZ 格式的色值。"},
			"keywords":    {"color picker, hex color picker, rgb color picker, oklch, lab color", "拾色器,颜色选择器,HEX,RGB,OKLCH"},
			"ogTitle":     {"Advanced Color Picker — 10+ Color Space Formats", "高级拾色器 — 支持 10+ 种色彩空间"},
			"ogDesc":      {"Get color values in HEX, RGB, HSL, HSV, CMYK, LAB, LCH, OKLCH, HWB, XYZ instantly.", "即时获取颜色的 HEX、RGB、HSL 等多种格式色值。"},
			"canonical":   {"https://ycjson.top/color/picker", "https://ycjson.top/color/picker?lang=zh"},
		},
		"palette": {
			"title":       {"Palette Generator — Press Space for Harmonious Color Palettes | json", "调色板生成器 — 按空格键生成和谐配色 | json"},
			"description": {"Generate beautiful color palettes with one keypress. Lock colors, apply harmony rules, share via URL, export CSS/SCSS/Tailwind.", "一键生成精美配色方案，锁定喜欢的颜色，导出 CSS/SCSS/Tailwind 配置。"},
			"keywords":    {"palette generator, color palette, color scheme generator, harmonious colors", "调色板生成器,配色方案,和谐配色"},
			"ogTitle":     {"Color Palette Generator — Spacebar to Generate", "调色板生成器 — 空格键一键生成"},
			"ogDesc":      {"Harmonious palettes in seconds. Lock, drag, share, export.", "几秒生成和谐调色板，锁定、拖拽、分享、导出。"},
			"canonical":   {"https://ycjson.top/color/palette", "https://ycjson.top/color/palette?lang=zh"},
		},
		"wheel": {
			"title":       {"Color Wheel — 6 Harmony Rules, Real-Time CSS Output | json", "色轮 — 6 种和谐规则，实时 CSS 输出 | json"},
			"description": {"Explore color harmonies with our interactive color wheel. Complementary, triadic, analogous, square and more.", "使用交互式色轮探索颜色和谐。互补色、三角色、类比色等多种规则。"},
			"keywords":    {"color wheel, color harmony, complementary colors, color theory", "色轮,颜色和谐,互补色,色彩理论"},
			"ogTitle":     {"Interactive Color Wheel — 6 Harmony Rules", "交互式色轮 — 6 种和谐规则"},
			"ogDesc":      {"Pick a base color and explore 6 harmony types with live CSS output.", "选择基准色，探索 6 种和谐类型，实时 CSS 输出。"},
			"canonical":   {"https://ycjson.top/color/wheel", "https://ycjson.top/color/wheel?lang=zh"},
		},
		"converter": {
			"title":       {"Color Converter — HEX, RGB, HSL, CMYK, OKLCH, LAB & More | json", "颜色转换器 — HEX、RGB、HSL、CMYK、OKLCH、LAB 等10种格式 | json"},
			"description": {"Convert colors between HEX, RGB, HSL, HSV, CMYK, LAB, LCH, OKLCH, HWB, XYZ instantly. The most complete free color converter.", "即时在 HEX、RGB、HSL、HSV、CMYK、LAB、LCH、OKLCH、HWB、XYZ 之间互转颜色。"},
			"keywords":    {"color converter, hex to rgb, rgb to hsl, cmyk converter, oklch converter", "颜色转换器,HEX转RGB,RGB转HSL,CMYK转换器"},
			"ogTitle":     {"Color Converter — 10 Formats, Instant Conversion", "颜色转换器 — 10 种格式即时转换"},
			"ogDesc":      {"The most complete color converter: HEX, RGB, HSL, HSV, CMYK, LAB, LCH, OKLCH, HWB, XYZ.", "最全面的颜色转换器：10 种色彩格式即时互转。"},
			"canonical":   {"https://ycjson.top/color/converter", "https://ycjson.top/color/converter?lang=zh"},
		},
		"contrast": {
			"title":       {"Contrast Checker — WCAG 2.1 & APCA Accessibility Tool | json", "对比度检查器 — WCAG 2.1 和 APCA 无障碍检查 | json"},
			"description": {"Check color contrast ratios against WCAG 2.1 AA/AAA and the new APCA standard. Ensure accessible designs.", "根据 WCAG 2.1 AA/AAA 和新的 APCA 标准检查颜色对比度，确保无障碍设计。"},
			"keywords":    {"contrast checker, wcag contrast, color accessibility, apca contrast, wcag aa aaa", "对比度检查器,WCAG对比度,颜色无障碍,APCA"},
			"ogTitle":     {"Contrast Checker — WCAG 2.1 + APCA Dual Standard", "对比度检查器 — WCAG 2.1 + APCA 双标准"},
			"ogDesc":      {"Industry's first tool showing both WCAG 2.1 ratio and APCA score side by side.", "全球首个同时展示 WCAG 2.1 比值和 APCA 分数的工具。"},
			"canonical":   {"https://ycjson.top/color/contrast", "https://ycjson.top/color/contrast?lang=zh"},
		},
		"gradient": {
			"title":       {"Gradient Generator — OKLCH Perceptual Interpolation | json", "渐变生成器 — OKLCH 感知均匀插值 | json"},
			"description": {"Create beautiful gradients with perceptual color interpolation in OKLCH, LCH, LAB, and HSL. No more muddy grey zones.", "使用 OKLCH、LCH、LAB、HSL 感知色彩插值创建精美渐变，彻底消除灰暗死区。"},
			"keywords":    {"gradient generator, css gradient, oklch gradient, linear gradient, perceptual gradient", "渐变生成器,CSS渐变,OKLCH渐变,线性渐变"},
			"ogTitle":     {"Gradient Generator — OKLCH Perceptual Interpolation, No Grey Zones", "渐变生成器 — OKLCH 感知插值，无灰色死区"},
			"ogDesc":      {"8 color space interpolation options. Copy CSS in one click.", "8 种色彩空间插值，一键复制 CSS 代码。"},
			"canonical":   {"https://ycjson.top/color/gradient", "https://ycjson.top/color/gradient?lang=zh"},
		},
		"image-picker": {
			"title":       {"Image Color Picker — Extract Palette from Any Image | json", "图片取色器 — 从任意图片提取调色板 | json"},
			"description": {"Extract dominant colors and precise pixel colors from images using K-means clustering. Supports JPG, PNG, WebP, SVG.", "使用 K-means 聚类从图片提取主色调和精确像素颜色。支持 JPG、PNG、WebP、SVG。"},
			"keywords":    {"image color picker, extract colors from image, dominant colors, color palette from image", "图片取色器,图片提取颜色,主色调提取"},
			"ogTitle":     {"Image Color Picker — K-means Clustering + Pixel Picker", "图片取色器 — K-means 聚类 + 像素取色"},
			"ogDesc":      {"Pick exact pixel colors or auto-extract dominant palette from any image.", "精确像素取色或自动提取主色调调色板。"},
			"canonical":   {"https://ycjson.top/color/image-picker", "https://ycjson.top/color/image-picker?lang=zh"},
		},
		"blindness": {
			"title":       {"Color Blindness Simulator — 8 Vision Types | json", "色盲模拟器 — 8 种色觉缺陷 | json"},
			"description": {"Simulate how your colors look for people with 8 types of color vision deficiency including protanopia, deuteranopia, and achromatopsia.", "模拟 8 种色觉缺陷下的颜色效果，包括红色盲、绿色盲和全色盲。"},
			"keywords":    {"color blindness simulator, protanopia, deuteranopia, tritanopia, color accessibility", "色盲模拟器,红色盲,绿色盲,色觉缺陷"},
			"ogTitle":     {"Color Blindness Simulator — 8 Deficiency Types", "色盲模拟器 — 8 种色觉缺陷类型"},
			"ogDesc":      {"See your palette through 8 types of color vision deficiency. Before/After comparison.", "通过 8 种色觉缺陷查看调色板效果，前后对比。"},
			"canonical":   {"https://ycjson.top/color/blindness", "https://ycjson.top/color/blindness?lang=zh"},
		},
		"names": {
			"title":       {"Color Names Library — 2000+ Named Colors with Search | json", "颜色名称库 — 2000+ 命名颜色搜索 | json"},
			"description": {"Browse and search 2000+ named colors. Find the closest named color to any HEX value. Copy CSS color names instantly.", "浏览搜索 2000+ 命名颜色，查找任意 HEX 值最接近的命名颜色。"},
			"keywords":    {"color names, css color names, named colors, color library, web colors", "颜色名称,CSS颜色名,命名颜色,颜色库"},
			"ogTitle":     {"Color Names Library — 2000+ Colors, Instant Search", "颜色名称库 — 2000+ 颜色即时搜索"},
			"ogDesc":      {"Find any color name by HEX or search by name. Copy CSS in one click.", "通过 HEX 或名称查找颜色，一键复制 CSS。"},
			"canonical":   {"https://ycjson.top/color/names", "https://ycjson.top/color/names?lang=zh"},
		},
		"mixer": {
			"title":       {"Color Mixer — Blend Colors with Multiple Modes | json", "颜色混合器 — 多种混合模式 | json"},
			"description": {"Mix and blend two colors using additive, subtractive, and multiply blend modes. See intermediate gradient steps.", "使用加色、减色和正片叠底混合模式混合两种颜色，查看中间渐变色阶。"},
			"keywords":    {"color mixer, blend colors, color blending, mix colors online", "颜色混合器,颜色混合,混合颜色"},
			"ogTitle":     {"Color Mixer — Additive, Subtractive & Multiply Blend Modes", "颜色混合器 — 加色、减色和正片叠底"},
			"ogDesc":      {"Mix any two colors and see the result in multiple blend modes.", "混合任意两种颜色，查看多种混合模式结果。"},
			"canonical":   {"https://ycjson.top/color/mixer", "https://ycjson.top/color/mixer?lang=zh"},
		},
		"tailwind": {
			"title":       {"Tailwind CSS Color Generator — Full Shade Scale from Any Color | json", "Tailwind CSS 颜色生成器 — 从任意颜色生成完整色阶 | json"},
			"description": {"Generate a complete Tailwind CSS shade scale (50-950) from any base color. Copy ready-to-use Tailwind config.", "从任意基准色生成完整的 Tailwind CSS 色阶（50-950），复制即用的配置代码。"},
			"keywords":    {"tailwind color generator, tailwind palette, tailwind color scale, custom tailwind colors", "Tailwind颜色生成器,Tailwind调色板,Tailwind色阶"},
			"ogTitle":     {"Tailwind Color Generator — 50 to 950 Shade Scale", "Tailwind 颜色生成器 — 50 到 950 色阶"},
			"ogDesc":      {"Instant Tailwind shade scale from any base color with UI preview.", "从任意基准色即时生成 Tailwind 色阶，带 UI 预览。"},
			"canonical":   {"https://ycjson.top/color/tailwind", "https://ycjson.top/color/tailwind?lang=zh"},
		},
	}

	seo, ok := data[tool]
	if !ok {
		seo = data["tools"]
	}
	pick := func(e entry) string {
		if lang == "zh" {
			return e.zh
		}
		return e.en
	}
	return map[string]string{
		"title":       pick(seo["title"]),
		"description": pick(seo["description"]),
		"keywords":    pick(seo["keywords"]),
		"ogTitle":     pick(seo["ogTitle"]),
		"ogDesc":      pick(seo["ogDesc"]),
		"canonical":   pick(seo["canonical"]),
	}
}

func colorPageData(c *gin.Context, tool string) gin.H {
	lang := c.GetString("lang")
	if lang == "" {
		lang = "en"
	}
	t := render.GetT(c)
	seo := colorSEO(tool, lang)
	faqData := faq.ColorFAQs(lang)

	return render.BaseData(c, gin.H{
		"Title":        seo["title"],
		"Description":  seo["description"],
		"Keywords":     seo["keywords"],
		"Lang":         lang,
		"T":            t,
		"SEO":          seo,
		"FAQ":          faqData,
		"ToolName":     "color-" + tool,
		"ActiveTool":   tool,
		"CanonicalURL": seo["canonical"],
		"HreflangEN":   "https://ycjson.top/color/" + tool + "?lang=en",
		"HreflangZH":   "https://ycjson.top/color/" + tool + "?lang=zh",
		"PageClass":    "page-color-" + tool,
	})
}

// ColorToolsHub Renders the color tools hub page.
func ColorToolsHub(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "tools"))
}

// ColorPickerPage Renders the advanced color picker.
func ColorPickerPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "picker"))
}

// ColorPalettePage Renders the palette generator.
func ColorPalettePage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "palette"))
}

// ColorWheelPage Renders the color wheel.
func ColorWheelPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "wheel"))
}

// ColorConverterV2Page Renders the full color converter.
func ColorConverterV2Page(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "converter"))
}

// ColorContrastPage Renders the WCAG+APCA contrast checker.
func ColorContrastPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "contrast"))
}

// ColorGradientPage Renders the gradient generator.
func ColorGradientPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "gradient"))
}

// ColorImagePickerPage Renders the image color extractor.
func ColorImagePickerPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "image-picker"))
}

// ColorBlindnessPage Renders the color blindness simulator.
func ColorBlindnessPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "blindness"))
}

// ColorNamesPage Renders the color names library.
func ColorNamesPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "names"))
}

// ColorMixerPage Renders the color mixer.
func ColorMixerPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "mixer"))
}

// ColorTailwindPage Renders the Tailwind color generator.
func ColorTailwindPage(c *gin.Context) {
	render.Render(c, "color/tools.html", colorPageData(c, "tailwind"))
}
