package json

import (
	json2 "PycMono/github/json/common/vo/json"
	"PycMono/github/json/infrastructure/controller/http/render"
	"html/template"
	"net/http"
	"strings"
	"unicode"

	"github.com/gin-gonic/gin"
)

// jsonOutputTools indicates which tools produce valid JSON output (for tree view)
var jsonOutputTools = map[string]bool{
	"validate": true, "pretty": true, "minify": true, "sort-keys": true,
	"unescape": true, "flatten": true, "repair": true, "jsonc": true,
	"jwt": true, "path": true, "token-count": true,
	"from-csv": true, "from-yaml": true, "from-xml": true, "from-sql": true,
	"schema-generate": true, "from-toml": true, "from-query": true,
	"python-dict": true, "json-generator": true,
	"jsonl": true, "merge": true, "transform": true, "patch": true,
	"mock": true, "redact": true, "array": true, "key-transform": true,
}

// hotToolKeys is the list of hot tools shown in the topbar
var hotToolKeys = []string{"validate", "pretty", "diff", "tree", "jwt", "to-typescript", "to-yaml", "schema-generate"}

// JsonLearnResource is a card for learn/datasets on the home page
type JsonLearnResource struct {
	Icon    string
	TitleZH string
	TitleEN string
	DescZH  string
	DescEN  string
	URL     string
	Badge   string
}

func getJsonToolMeta(key string) json2.JsonToolMeta {
	for _, m := range json2.AllJsonToolMetas {
		if m.Key == key {
			return m
		}
	}
	return json2.JsonToolMeta{Key: key, Icon: "🔧", TitleZH: key, TitleEN: key}
}

func getHotTools() []json2.JsonToolMeta {
	var hot []json2.JsonToolMeta
	for _, k := range hotToolKeys {
		hot = append(hot, getJsonToolMeta(k))
	}
	return hot
}

func getRelatedTools(currentKey string) []json2.JsonToolMeta {
	current := getJsonToolMeta(currentKey)
	var related []json2.JsonToolMeta
	for _, m := range json2.AllJsonToolMetas {
		if m.Key != currentKey && m.Group == current.Group {
			related = append(related, m)
			if len(related) >= 4 {
				break
			}
		}
	}
	return related
}

// JsonToolPage returns a gin.HandlerFunc for a specific JSON tool
func JsonToolPage(toolKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		lang := c.GetString("lang")
		if lang == "" {
			lang = "zh"
		}
		t := render.GetT(c)
		meta := getJsonToolMeta(toolKey)

		title := meta.TitleZH
		desc := meta.DescZH
		if lang == "en" {
			title = meta.TitleEN
			desc = meta.DescEN
		}

		siteTitle := title + " — " + map[string]string{
			"zh": "免费在线 JSON 工具 | json",
			"en": "Free Online JSON Tool | json",
		}[lang]

		// Canonical URL
		canonical := "https://ycjson.top/json/" + toolKey
		hreflangZH := "https://ycjson.top/json/" + toolKey + "?lang=zh"
		hreflangEN := "https://ycjson.top/json/" + toolKey + "?lang=en"

		var seoArticle string
		switch toolKey {
		case "validate":
			// Add SEO article from i18n (as HTML)
			seoArticle = t("json.validate.seo.article")
		case "repair":
			seoArticle = t("json.repair.seo.article")
		case "pretty":
			seoArticle = t("json.pretty.seo.article")
		case "unescape":
			seoArticle = t("json.unescape.seo.article")
		case "stringify":
			seoArticle = t("json.stringify.seo.article")
		case "minify":
			seoArticle = t("json.minify.seo.article")
		case "sort-keys":
			seoArticle = t("json.sort-keys.seo.article")
		case "escape":
			seoArticle = t("json.escape.seo.article")
		case "tree":
			seoArticle = t("json.tree.seo.article")
		case "table":
			seoArticle = t("json.table.seo.article")
		case "diff":
			seoArticle = t("json.diff.seo.article")
		case "path":
			seoArticle = t("json.path.seo.article")
		case "search":
			seoArticle = t("json.search.seo.article")
		case "size":
			seoArticle = t("json.size.seo.article")
		case "flatten":
			seoArticle = t("json.flatten.seo.article")
		case "to-csv":
			seoArticle = t("json.to-csv.seo.article")
		case "from-csv":
			seoArticle = t("json.from-csv.seo.article")
		case "to-excel":
			seoArticle = t("json.to-excel.seo.article")
		case "from-excel":
			seoArticle = t("json.from-excel.seo.article")
		case "to-yaml":
			seoArticle = t("json.to-yaml.seo.article")
		case "from-yaml":
			seoArticle = t("json.from-yaml.seo.article")
		case "to-xml":
			seoArticle = t("json.to-xml.seo.article")
		case "from-xml":
			seoArticle = t("json.from-xml.seo.article")
		case "to-sql":
			seoArticle = t("json.to-sql.seo.article")
		case "from-sql":
			seoArticle = t("json.from-sql.seo.article")
		case "to-markdown":
			seoArticle = t("json.to-markdown.seo.article")
		case "to-toml":
			seoArticle = t("json.to-toml.seo.article")
		case "from-toml":
			seoArticle = t("json.from-toml.seo.article")
		case "to-typescript":
			seoArticle = t("json.to-typescript.seo.article")
		case "to-python":
			seoArticle = t("json.to-python.seo.article")
		case "to-java":
			seoArticle = t("json.to-java.seo.article")
		case "to-csharp":
			seoArticle = t("json.to-csharp.seo.article")
		case "to-go":
			seoArticle = t("json.to-go.seo.article")
		case "to-kotlin":
			seoArticle = t("json.to-kotlin.seo.article")
		case "to-swift":
			seoArticle = t("json.to-swift.seo.article")
		case "to-rust":
			seoArticle = t("json.to-rust.seo.article")
		case "to-php":
			seoArticle = t("json.to-php.seo.article")
		case "to-dart":
			seoArticle = t("json.to-dart.seo.article")
		case "to-objectivec":
			seoArticle = t("json.to-objectivec.seo.article")
		case "to-cpp":
			seoArticle = t("json.to-cpp.seo.article")
		case "to-ruby":
			seoArticle = t("json.to-ruby.seo.article")
		case "to-scala":
			seoArticle = t("json.to-scala.seo.article")
		case "to-zod":
			seoArticle = t("json.to-zod.seo.article")
		case "to-graphql":
			seoArticle = t("json.to-graphql.seo.article")
		case "json-generator":
		case "random":
			seoArticle = t("json.generator.seo.article")
		case "to-url-params":
			seoArticle = t("json.to-url-params.seo.article")
		case "from-url-params":
			seoArticle = t("json.from-url-params.seo.article")
		case "python-dict":
			seoArticle = t("json.python-dict.seo.article")
		case "merge":
			seoArticle = t("json.merge.seo.article")
		case "transform":
			seoArticle = t("json.transform.seo.article")
		case "jsonl":
			seoArticle = t("json.jsonl.seo.article")
		case "patch":
			seoArticle = t("json.patch.seo.article")
		case "mock":
			seoArticle = t("json.mock.seo.article")
		case "to-env":
			seoArticle = t("json.to-env.seo.article")
		case "redact":
			seoArticle = t("json.redact.seo.article")
		case "array":
			seoArticle = t("json.array.seo.article")
		case "key-transform":
			seoArticle = t("json.key-transform.seo.article")
		case "base64":
			seoArticle = t("json.base64.seo.article")
		case "jwt":
			seoArticle = t("json.jwt.seo.article")
		case "jsonc":
			seoArticle = t("json.jsonc.seo.article")
		case "token-count":
			seoArticle = t("json.token-count.seo.article")
		case "highlight-export":
			seoArticle = t("json.highlight-export.seo.article")
		case "schema-validate":
			seoArticle = t("json.schema-validate.seo.article")
		case "schema-generate":
			seoArticle = t("json.schema-generate.seo.article")
		}

		data := render.BaseData(c, gin.H{
			"Title":        siteTitle,
			"Description":  desc,
			"Keywords":     meta.Keywords,
			"Canonical":    canonical,
			"HreflangZH":   hreflangZH,
			"HreflangEN":   hreflangEN,
			"Lang":         lang,
			"T":            t,
			"ToolKey":      toolKey,
			"Meta":         meta,
			"HotTools":     getHotTools(),
			"RelatedTools": getRelatedTools(toolKey),
			"AllTools":     json2.AllJsonToolMetas,
			"PageClass":    "page-json-tool",
			"OutputIsJSON": jsonOutputTools[toolKey],
			"SEOArticle":   template.HTML(seoArticle),
		})
		render.RenderJSONTool(c, "tool.html", data)
	}
}

// JsonToolsHome renders the JSON tools landing page
func JsonToolsHome(c *gin.Context) {
	lang := c.GetString("lang")
	if lang == "" {
		lang = "zh"
	}
	t := render.GetT(c)

	// Load SEO article for home page
	seoArticle := t("json.home.seo.article")

	titleMap := map[string]string{
		"zh": "JSON 工具箱 — 40+ 免费在线 JSON 验证、格式化、转换工具 | json",
		"en": "JSON Toolkit — 40+ Free Online JSON Validate, Format & Convert Tools | json",
	}
	descMap := map[string]string{
		"zh": "免费在线 JSON 工具集，提供验证、格式化、压缩、对比、转换等 40+ 实用工具，支持 TypeScript/Go/Python 等 9 种语言代码生成，实时语法检查与错误高亮",
		"en": "Free online JSON toolkit with 40+ tools for validation, formatting, minification, diff, conversion and code generation for TypeScript, Go, Python and more",
	}

	learnResources := []JsonLearnResource{
		{Icon: "📚", TitleZH: "学习 JSON", TitleEN: "Learn JSON", DescZH: "53+ 篇教程，从基础到 Schema、安全和实战应用", DescEN: "53+ tutorials from beginner to advanced. Schema, JSONPath, jq, security & more.", URL: "/json/learn", Badge: "53+"},
		{Icon: "🗃️", TitleZH: "JSON 数据集", TitleEN: "JSON Datasets", DescZH: "85+ 免费开源数据集，用于测试和开发", DescEN: "85+ free, open-source datasets for testing and development.", URL: "/json/datasets", Badge: "85+"},
	}

	// Root (/) is the canonical JSON homepage
	canonical := "https://ycjson.top/"

	// If serving from root, pretend we're on /json so navbar active-states work
	currentPath := c.Request.URL.Path
	if currentPath == "/" {
		currentPath = "/json"
	}

	data := render.BaseData(c, gin.H{
		"Title":          titleMap[lang],
		"Description":    descMap[lang],
		"Keywords":       "json tools, json formatter, json validator, json converter, json beautifier, json minifier, json to typescript, json to go, json to python, free online json, json diff, json tree viewer",
		"Lang":           lang,
		"T":              t,
		"AllTools":       json2.AllJsonToolMetas,
		"HotTools":       getHotTools(),
		"LearnResources": learnResources,
		"PageClass":      "page-json-home",
		"SEOArticle":     template.HTML(seoArticle),
		"Canonical":      canonical,
		"HreflangEN":     canonical + "?lang=en",
		"HreflangZH":     canonical + "?lang=zh",
		"CurrentPath":    currentPath,
	})
	render.RenderJSONTool(c, "home.html", data)
}

// TokenCountAPI handles the token counting API (backend fallback)
func TokenCountAPI(c *gin.Context) {
	var req struct {
		Text  string `json:"text"`
		Model string `json:"model"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	text := req.Text
	chars := len([]rune(text))
	bytes := len(text)

	// Simple word count
	words := len(strings.Fields(text))

	// Approximate token count (cl100k_base average: ~4 chars/token for English, ~2 for CJK)
	hasCJK := false
	for _, r := range text {
		if unicode.Is(unicode.Han, r) || unicode.Is(unicode.Hangul, r) || unicode.Is(unicode.Hiragana, r) || unicode.Is(unicode.Katakana, r) {
			hasCJK = true
			break
		}
	}
	tokens := chars / 4
	if hasCJK {
		tokens = chars / 2
	}
	if tokens < 1 && chars > 0 {
		tokens = 1
	}

	model := req.Model
	if model == "" {
		model = "gpt-4"
	}

	c.JSON(http.StatusOK, gin.H{
		"count": tokens,
		"model": model,
		"chars": chars,
		"bytes": bytes,
		"words": words,
		"note":  "approximate (server-side estimation)",
	})
}
