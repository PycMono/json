package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// GAAudit scans the codebase for Google Analytics tracking coverage.
// It checks:
//   1. Controllers: ToolName injection (explicit or auto-derived)
//   2. Templates: data-ga / data-event attributes
//   3. JS files: gaTrack* function calls
//   4. ga-events.js: defined vs used vs referenced-but-undefined functions
//   5. Routes without explicit ToolName in controller

type Issue struct {
	File     string
	Line     int
	Severity string // error, warn, info
	Message  string
}

type AuditReport struct {
	ControllerToolNameTotal   int
	ControllerToolNameMissing int
	TemplateWithGA            int
	TemplateTotal             int
	JSWithTracking            int
	JSTotal                   int
	UndefinedGAFunctions      []string
	UnusedGAFunctions         []string
	MissingToolNameRoutes     []string
	Issues                    []Issue
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run scripts/ga-audit.go <project-root>")
		os.Exit(1)
	}
	root := os.Args[1]

	report := &AuditReport{}

	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║        ToolBoxNova GA Tracking Audit Report                  ║")
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")
	fmt.Println()

	// 1. Audit controllers
	fmt.Println("[1/5] Auditing controllers for ToolName injection...")
	auditControllers(root, report)

	// 2. Audit templates
	fmt.Println("[2/5] Auditing templates for data-ga attributes...")
	auditTemplates(root, report)

	// 3. Audit JS files
	fmt.Println("[3/5] Auditing JS files for gaTrack calls...")
	auditJS(root, report)

	// 4. Audit ga-events.js function usage
	fmt.Println("[4/5] Auditing ga-events.js function definitions vs usage...")
	auditGAEventsJS(root, report)

	// 5. Check routes vs controllers
	fmt.Println("[5/5] Checking route coverage...")
	auditRoutes(root, report)

	// Print summary
	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║                       SUMMARY                                ║")
	fmt.Println("╠══════════════════════════════════════════════════════════════╣")
	pageGo := filepath.Join(root, "infrastructure", "controller", "http", "render", "page.go")
	pageContent, _ := os.ReadFile(pageGo)
	baseDataAutoDerives := strings.Contains(string(pageContent), "getToolName(")
	if baseDataAutoDerives {
		fmt.Printf("║ Controllers (explicit):       %3d / %3d                     ║\n",
			report.ControllerToolNameTotal-report.ControllerToolNameMissing, report.ControllerToolNameTotal)
		fmt.Printf("║ Controllers (auto-derived):   %3d / %3d  ✅                ║\n",
			report.ControllerToolNameTotal, report.ControllerToolNameTotal)
	} else {
		fmt.Printf("║ Controllers with ToolName:    %3d / %3d                     ║\n",
			report.ControllerToolNameTotal-report.ControllerToolNameMissing, report.ControllerToolNameTotal)
	}
	fmt.Printf("║ Templates with data-ga:       %3d / %3d                     ║\n",
		report.TemplateWithGA, report.TemplateTotal)
	fmt.Printf("║ JS files with gaTrack:        %3d / %3d                     ║\n",
		report.JSWithTracking, report.JSTotal)
	fmt.Printf("║ Undefined gaTrack functions:  %3d                           ║\n",
		len(report.UndefinedGAFunctions))
	fmt.Printf("║ Unused gaTrack functions:     %3d                           ║\n",
		len(report.UnusedGAFunctions))
	fmt.Printf("║ Total issues found:           %3d                           ║\n",
		len(report.Issues))
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")
	fmt.Println()

	if len(report.UndefinedGAFunctions) > 0 {
		fmt.Println("⚠️  UNDEFINED gaTrack functions (referenced but not in ga-events.js):")
		for _, fn := range report.UndefinedGAFunctions {
			fmt.Printf("   - %s\n", fn)
		}
		fmt.Println()
	}

	if len(report.UnusedGAFunctions) > 0 {
		fmt.Println("ℹ️  UNUSED gaTrack functions (defined but never called):")
		for _, fn := range report.UnusedGAFunctions {
			fmt.Printf("   - %s\n", fn)
		}
		fmt.Println()
	}

	if len(report.MissingToolNameRoutes) > 0 {
		fmt.Println("⚠️  Routes likely missing explicit ToolName:")
		for _, route := range report.MissingToolNameRoutes {
			fmt.Printf("   - %s\n", route)
		}
		fmt.Println()
	}

	if len(report.Issues) > 0 {
		fmt.Println("📋 Detailed issues:")
		for _, issue := range report.Issues {
			fmt.Printf("   [%s] %s:%d — %s\n", issue.Severity, issue.File, issue.Line, issue.Message)
		}
	}

	// Exit code: 1 if critical issues found
	critical := 0
	for _, issue := range report.Issues {
		if issue.Severity == "error" {
			critical++
		}
	}
	if len(report.UndefinedGAFunctions) > 0 {
		critical++
	}
	if critical > 0 {
		fmt.Printf("\n❌ Audit failed with %d critical issue(s).\n", critical)
		os.Exit(1)
	}
	fmt.Println("\n✅ Audit passed (no critical issues).")
}

func auditControllers(root string, report *AuditReport) {
	ctrlDir := filepath.Join(root, "infrastructure", "controller", "http")
	fset := token.NewFileSet()

	// Check if BaseData auto-derives ToolName
	pageGo := filepath.Join(ctrlDir, "render", "page.go")
	pageContent, _ := os.ReadFile(pageGo)
	baseDataAutoDerives := strings.Contains(string(pageContent), "getToolName(")

	filepath.Walk(ctrlDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
			return nil
		}
		report.ControllerToolNameTotal++

		f, err := parser.ParseFile(fset, path, nil, parser.AllErrors)
		if err != nil {
			return nil
		}

		hasToolName := false
		ast.Inspect(f, func(n ast.Node) bool {
			kv, ok := n.(*ast.KeyValueExpr)
			if !ok {
				return true
			}
			key, ok := kv.Key.(*ast.BasicLit)
			if ok && strings.Trim(key.Value, `"`) == "ToolName" {
				hasToolName = true
				return false
			}
			return true
		})

		if !hasToolName {
			report.ControllerToolNameMissing++
			// Extract handler names
			content, _ := os.ReadFile(path)
			re := regexp.MustCompile(`func\s+(\w+)\s*\(\s*c\s*\*gin\.Context\s*\)`)
			matches := re.FindAllStringSubmatch(string(content), -1)
			for _, m := range matches {
				if strings.HasSuffix(m[1], "Page") {
					msg := fmt.Sprintf("handler %s missing explicit ToolName", m[1])
					if baseDataAutoDerives {
						msg += " (auto-derived by BaseData)"
					}
					report.Issues = append(report.Issues, Issue{
						File:     path,
						Line:     0,
						Severity: "info",
						Message:  msg,
					})
				}
			}
		}
		return nil
	})
}

func auditTemplates(root string, report *AuditReport) {
	tmplDir := filepath.Join(root, "frontend", "templates")
	dataGaRe := regexp.MustCompile(`data-ga`)
	onclickRe := regexp.MustCompile(`gaTrack|gtag\(`)

	filepath.Walk(tmplDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".html") {
			return nil
		}
		report.TemplateTotal++
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		s := string(content)
		if dataGaRe.MatchString(s) || onclickRe.MatchString(s) {
			report.TemplateWithGA++
		} else {
			// Skip base/layout partials — they don't need explicit tracking
			name := filepath.Base(path)
			if name != "base.html" && name != "tools_base.html" && !strings.HasPrefix(name, "_") &&
				!strings.Contains(path, "partials/") && !strings.Contains(path, "email/") {
				report.Issues = append(report.Issues, Issue{
					File:     path,
					Line:     0,
					Severity: "info",
					Message:  "template has no data-ga or gaTrack attributes",
				})
			}
		}
		return nil
	})
}

func auditJS(root string, report *AuditReport) {
	jsDir := filepath.Join(root, "frontend", "static", "js")
	gaTrackRe := regexp.MustCompile(`gaTrack\w+\(`)

	filepath.Walk(jsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".js") {
			return nil
		}
		report.JSTotal++
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		if gaTrackRe.Match(content) {
			report.JSWithTracking++
		} else {
			// Skip common libs / data-only / shared-utility files without tracking
			name := filepath.Base(path)
			if name != "ga-events.js" && name != "consent-engine.js" && name != "theme.js" &&
				name != "main.js" && !strings.Contains(name, "lib") &&
				name != "ai-tool-nav.js" && name != "datasets-meta.js" && name != "img-tabs.js" &&
				name != "json-codegen-core.js" && name != "json-tool-descriptions.js" &&
				name != "platform-icons.js" && !strings.Contains(path, "learn-articles") {
				report.Issues = append(report.Issues, Issue{
					File:     path,
					Line:     0,
					Severity: "warn",
					Message:  "JS file has no gaTrack calls",
				})
			}
		}
		return nil
	})
}

func auditGAEventsJS(root string, report *AuditReport) {
	path := filepath.Join(root, "frontend", "static", "js", "ga-events.js")
	content, err := os.ReadFile(path)
	if err != nil {
		fmt.Printf("Warning: could not read ga-events.js: %v\n", err)
		return
	}

	s := string(content)

	// Find all defined gaTrack functions
	defRe := regexp.MustCompile(`function\s+(gaTrack\w+)\s*\(`)
	defined := map[string]bool{}
	for _, m := range defRe.FindAllStringSubmatch(s, -1) {
		defined[m[1]] = true
	}

	// Find all gaTrack calls across all JS files
	callRe := regexp.MustCompile(`(gaTrack\w+)\s*\(`)
	called := map[string]bool{}
	jsDir := filepath.Join(root, "frontend", "static", "js")
	filepath.Walk(jsDir, func(p string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(p, ".js") {
			return nil
		}
		c, _ := os.ReadFile(p)
		for _, m := range callRe.FindAllStringSubmatch(string(c), -1) {
			called[m[1]] = true
		}
		return nil
	})

	// Find typeof checks (guarded references)
	typeofRe := regexp.MustCompile(`typeof\s+(gaTrack\w+)\s*===?\s*['"]function['"]`)
	guarded := map[string]bool{}
	filepath.Walk(jsDir, func(p string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(p, ".js") {
			return nil
		}
		c, _ := os.ReadFile(p)
		for _, m := range typeofRe.FindAllStringSubmatch(string(c), -1) {
			guarded[m[1]] = true
		}
		return nil
	})

	// Undefined = called/guarded but not defined
	for fn := range called {
		if !defined[fn] {
			report.UndefinedGAFunctions = append(report.UndefinedGAFunctions, fn)
		}
	}
	for fn := range guarded {
		if !defined[fn] {
			// Only add if not already in called
			found := false
			for _, u := range report.UndefinedGAFunctions {
				if u == fn {
					found = true
					break
				}
			}
			if !found {
				report.UndefinedGAFunctions = append(report.UndefinedGAFunctions, fn)
			}
		}
	}
	sort.Strings(report.UndefinedGAFunctions)

	// Unused = defined but never called
	for fn := range defined {
		if !called[fn] && fn != "gaTrackPageView" && fn != "gaTrackScroll90" {
			report.UnusedGAFunctions = append(report.UnusedGAFunctions, fn)
		}
	}
	sort.Strings(report.UnusedGAFunctions)
}

func auditRoutes(root string, report *AuditReport) {
	// Read router.go to extract all GET page routes
	routerPath := filepath.Join(root, "infrastructure", "controller", "http", "router.go")
	content, _ := os.ReadFile(routerPath)
	s := string(content)

	// Find routes like r.GET("/path", handler)
	routeRe := regexp.MustCompile(`r\.GET\s*\(\s*"([^"]+)"\s*,\s*(\w+)`)
	routes := routeRe.FindAllStringSubmatch(s, -1)

	// Find routes in groups
	groupRouteRe := regexp.MustCompile(`\w+\.GET\s*\(\s*"([^"]+)"\s*,\s*(\w+)`)
	groupRoutes := groupRouteRe.FindAllStringSubmatch(s, -1)
	routes = append(routes, groupRoutes...)

	// Check which controllers have ToolName
	ctrlDir := filepath.Join(root, "infrastructure", "controller", "http")
	handlerToFile := map[string]string{}
	fileHasToolName := map[string]bool{}
	filepath.Walk(ctrlDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") {
			return nil
		}
		content, _ := os.ReadFile(path)
		sContent := string(content)
		if strings.Contains(sContent, `"ToolName"`) {
			fileHasToolName[path] = true
		}
		// Extract handler names
		re := regexp.MustCompile(`func\s+(\w+)\s*\(\s*c\s*\*gin\.Context\s*\)`)
		matches := re.FindAllStringSubmatch(sContent, -1)
		for _, m := range matches {
			handlerToFile[m[1]] = path
		}
		return nil
	})

	// Simple heuristic: check if the handler is in a file that has ToolName
	for _, r := range routes {
		routePath := r[1]
		handler := r[2]
		if strings.HasPrefix(routePath, "/api/") || strings.HasPrefix(routePath, "/auth/") {
			continue
		}
		// Skip if it's a redirect or simple handler
		if handler == "func" {
			continue
		}

		file, ok := handlerToFile[handler]
		if !ok {
			// Handler not found in controller files — might be in render package
			file = filepath.Join(ctrlDir, "render", "page.go")
		}
		foundToolName := fileHasToolName[file]

		if !foundToolName && !strings.Contains(routePath, "*") && routePath != "/" {
			report.MissingToolNameRoutes = append(report.MissingToolNameRoutes,
				fmt.Sprintf("%s → %s", routePath, handler))
		}
	}

	// Deduplicate
	seen := map[string]bool{}
	unique := []string{}
	for _, r := range report.MissingToolNameRoutes {
		if !seen[r] {
			seen[r] = true
			unique = append(unique, r)
		}
	}
	sort.Strings(unique)
	report.MissingToolNameRoutes = unique
}
