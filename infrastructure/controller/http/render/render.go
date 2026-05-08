package render

import (
	json2 "PycMono/github/json/common/vo/json"
	"context"
	"encoding/json"
	"fmt"
	logsdk "github.com/PycMono/go-logger-sdk"
	"html/template"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

var funcMap = template.FuncMap{
	"call": func(fn func(string) string, key string) string {
		if fn == nil {
			return key
		}
		return fn(key)
	},
	"lower":    strings.ToLower,
	"upper":    strings.ToUpper,
	"safeJS":   func(s string) template.JS { return template.JS(s) },
	"safeHTML": func(s string) template.HTML { return template.HTML(s) },
	"toJSON": func(v interface{}) template.JS {
		b, err := json.Marshal(v)
		if err != nil {
			return template.JS("{}")
		}
		return template.JS(b)
	},
	"dict": func(values ...interface{}) (map[string]interface{}, error) {
		if len(values)%2 != 0 {
			return nil, fmt.Errorf("dict requires even number of arguments")
		}
		dict := make(map[string]interface{}, len(values)/2)
		for i := 0; i < len(values); i += 2 {
			key, ok := values[i].(string)
			if !ok {
				return nil, fmt.Errorf("dict keys must be strings")
			}
			dict[key] = values[i+1]
		}
		return dict, nil
	},
	// list creates a []string slice - used in JSON tool frontend/templates
	"list": func(items ...string) []string { return items },
	// groupCount counts JSON tools belonging to a group
	"groupCount": func(tools interface{}, group string) int {
		count := 0
		if metas, ok := tools.([]json2.JsonToolMeta); ok {
			for _, m := range metas {
				if m.Group == group {
					count++
				}
			}
		}
		return count
	},
	// seq returns a range 0..n-1 (used for index checks)
	"seq": func(n int) []int {
		s := make([]int, n)
		for i := range s {
			s[i] = i
		}
		return s
	},
}

// Render 每次动态解析 base.html + 页面模板，避免 Gin LoadHTMLGlob
// 全局命名空间中 define 块互相覆盖导致所有页面渲染同一内容的问题。
func Render(c *gin.Context, page string, data gin.H) {
	// 构建模板文件列表（必须包含 partials）
	templateFiles := []string{
		filepath.Join("frontend/templates", "base.html"),
		filepath.Join("frontend/templates", page),
		filepath.Join("frontend/templates", "partials", "navbar.html"),
		filepath.Join("frontend/templates", "img", "_tabs.html"),
		filepath.Join("frontend/templates", "partials", "ad_slot.html"),
		filepath.Join("frontend/templates", "partials", "ga.html"),
		filepath.Join("frontend/templates", "partials", "cookie-consent.html"),
		filepath.Join("frontend/templates", "partials", "tool_tabs_nav.html"),
		filepath.Join("frontend/templates", "partials", "ai_tool_nav.html"),
	}

	// 先注册 FuncMap，再解析文件（顺序很重要）
	tmpl, err := template.New("").Funcs(funcMap).ParseFiles(templateFiles...)
	if err != nil {
		logsdk.Error(context.TODO(), "Template parse error", logsdk.Any("page", page), logsdk.Err(err))
		c.String(http.StatusInternalServerError, "Template parse error: %v", err)
		return
	}

	c.Header("Content-Type", "text/html; charset=utf-8")

	// 执行模板并显示详细错误
	if err := tmpl.ExecuteTemplate(c.Writer, "base", data); err != nil {
		logsdk.Error(context.TODO(), "Template execute error", logsdk.Any("page", page), logsdk.Err(err))
		_, _ = fmt.Fprintf(c.Writer, "\n\n<!-- Template Error: %v -->", err)
	}
}

// RenderPDFTool renders a PDF toolkit page (base.html layout + pdf tabs + tool template)
func RenderPDFTool(c *gin.Context, page string, data gin.H) {
	templateFiles := []string{
		filepath.Join("frontend/templates", "base.html"),
		filepath.Join("frontend/templates", page),
		filepath.Join("frontend/templates", "partials", "navbar.html"),
		filepath.Join("frontend/templates", "pdf", "_tabs.html"),
		filepath.Join("frontend/templates", "partials", "ad_slot.html"),
		filepath.Join("frontend/templates", "partials", "ga.html"),
		filepath.Join("frontend/templates", "partials", "cookie-consent.html"),
		filepath.Join("frontend/templates", "partials", "tool_tabs_nav.html"),
	}

	tmpl, err := template.New("").Funcs(funcMap).ParseFiles(templateFiles...)
	if err != nil {
		logsdk.Error(context.TODO(), "PDF Template parse error", logsdk.Any("page", page), logsdk.Err(err))
		c.String(http.StatusInternalServerError, "Template parse error: %v", err)
		return
	}

	c.Header("Content-Type", "text/html; charset=utf-8")

	if err := tmpl.ExecuteTemplate(c.Writer, "base", data); err != nil {
		logsdk.Error(context.TODO(), "PDF Template execute error", logsdk.Any("page", page), logsdk.Err(err))
		_, _ = fmt.Fprintf(c.Writer, "\n\n<!-- Template Error: %v -->", err)
	}
}
func RenderJSONTool(c *gin.Context, page string, data gin.H) {
	templateFiles := []string{
		filepath.Join("frontend/templates", "json", "_base.html"),
		filepath.Join("frontend/templates", "json", page),
		filepath.Join("frontend/templates", "partials", "navbar.html"),
		filepath.Join("frontend/templates", "partials", "ga.html"),
		filepath.Join("frontend/templates", "partials", "ad_slot.html"),
		filepath.Join("frontend/templates", "partials", "cookie-consent.html"),
	}

	tmpl, err := template.New("").Funcs(funcMap).ParseFiles(templateFiles...)
	if err != nil {
		logsdk.Error(context.TODO(), "JSON Template parse error", logsdk.Any("page", page), logsdk.Err(err))
		c.String(http.StatusInternalServerError, "Template parse error: %v", err)
		return
	}

	c.Header("Content-Type", "text/html; charset=utf-8")

	if err := tmpl.ExecuteTemplate(c.Writer, "json_base", data); err != nil {
		logsdk.Error(context.TODO(), "JSON Template execute error", logsdk.Any("page", page), logsdk.Err(err))
		_, _ = fmt.Fprintf(c.Writer, "\n\n<!-- Template Error: %v -->", err)
	}
}
