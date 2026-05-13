package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"
	"PycMono/github/json/infrastructure/controller/http/render"

	logsdk "github.com/PycMono/go-logger-sdk"
	"github.com/gin-gonic/gin"
)

// proxyListRepo 由 SetProxyListService() 注入（启动时）
var proxyListRepo repository.ProxyRepository

// SetProxyListService 由 cmd/server/main.go 启动阶段调用
func SetProxyListService(repo repository.ProxyRepository) {
	proxyListRepo = repo
}

// ── 页面 Handler ─────────────────────────────────────────────────

// ProxyListPage 渲染免费代理列表主页
func ProxyListPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	totalCount := 0
	aliveCount := 0
	countryCount := 0
	if proxyListRepo != nil {
		totalCount, _ = proxyListRepo.CountAll()
		aliveCount, _ = proxyListRepo.CountAlive()
		countryCount, _ = proxyListRepo.CountCountries()
	}

	jsonld := buildProxyListJSONLD(t)

	data := render.BaseData(c, gin.H{
		"Title":        t("proxy-list.seo.title") + " | Tool Box Nova",
		"Description":  t("proxy-list.seo.desc"),
		"Keywords":     t("proxy-list.seo.keywords"),
		"PageClass":    "page-proxy-list",
		"JSONLD":       jsonld,
		"SEOArticle":   template.HTML(t("proxy-list.seo.article")),
		"Lang":         lang,
		"TotalCount":   totalCount,
		"AliveCount":   aliveCount,
		"CountryCount": countryCount,
	})
	render.Render(c, "privacy/proxy-list.html", data)
}

// ── 数据 API Handler ─────────────────────────────────────────────

// ProxyListDataAPIResponse 接口响应结构
type ProxyListDataAPIResponse struct {
	List          []ProxyItemVO    `json:"list"`
	Total         int              `json:"total"`
	Page          int              `json:"page"`
	PageSize      int              `json:"page_size"`
	LastSync      string           `json:"last_sync"`
	CountryCounts []CountryCountVO `json:"country_counts,omitempty"`
}

// ProxyItemVO 前端消费的代理数据视图对象
type ProxyItemVO struct {
	ID          uint64  `json:"id"`
	IP          string  `json:"ip"`
	Port        int     `json:"port"`
	Protocol    string  `json:"protocol"`
	CountryCode string  `json:"country_code"`
	CountryName string  `json:"country_name"`
	Anonymity   string  `json:"anonymity"`
	LatencyMs   int     `json:"latency_ms"`
	UptimePct   float64 `json:"uptime_pct"`
	LastChecked string  `json:"last_checked"`
	IsAlive     bool    `json:"is_alive"`
}

// CountryCountVO 国家代理数量
type CountryCountVO struct {
	Code  string `json:"code"`
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// ProxyListDataAPI 返回分页代理数据
func ProxyListDataAPI(c *gin.Context) {
	protocol := strings.ToLower(c.DefaultQuery("protocol", "all"))
	countryParam := c.DefaultQuery("country", "all")
	anonymity := strings.ToLower(c.DefaultQuery("anonymity", "all"))
	sortBy := c.DefaultQuery("sort", "latency")
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "10")

	// country: 保持 "all" 原样，其他值转大写（国家代码是 2 字母大写）
	country := "all"
	if countryParam != "" && strings.ToLower(countryParam) != "all" {
		country = strings.ToUpper(countryParam)
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	if proxyListRepo == nil {
		c.JSON(http.StatusOK, ProxyListDataAPIResponse{
			List: []ProxyItemVO{}, Total: 0, Page: page, PageSize: pageSize,
			LastSync: "",
		})
		return
	}

	filter := repository.ProxyFilter{
		Protocol:  protocol,
		Country:   country,
		Anonymity: anonymity,
		SortBy:    sortBy,
		Page:      page,
		PageSize:  pageSize,
		AliveOnly: true,
	}

	entities, total, lastSync, err := proxyListRepo.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db_error"})
		return
	}

	vos := make([]ProxyItemVO, 0, len(entities))
	for _, e := range entities {
		vos = append(vos, ProxyItemVO{
			ID:          e.ID,
			IP:          e.IP,
			Port:        e.Port,
			Protocol:    string(e.Protocol),
			CountryCode: e.CountryCode,
			CountryName: e.CountryName,
			Anonymity:   string(e.Anonymity),
			LatencyMs:   e.LatencyMs,
			UptimePct:   float64(e.UptimePct),
			LastChecked: e.LastChecked.Format(time.RFC3339),
			IsAlive:     e.IsAlive,
		})
	}

	lastSyncStr := ""
	if !lastSync.IsZero() {
		lastSyncStr = lastSync.Format(time.RFC3339)
	}

	// 获取国家计数
	countryCounts, _ := proxyListRepo.CountByCountry(protocol)

	ccVOs := make([]CountryCountVO, 0, len(countryCounts))
	for _, cc := range countryCounts {
		ccVOs = append(ccVOs, CountryCountVO{
			Code:  cc.Code,
			Name:  cc.Name,
			Count: cc.Count,
		})
	}

	c.JSON(http.StatusOK, ProxyListDataAPIResponse{
		List: vos, Total: total, Page: page, PageSize: pageSize,
		LastSync:      lastSyncStr,
		CountryCounts: ccVOs,
	})
}

// ProxyListRefreshAPI 手动触发代理数据同步
func ProxyListRefreshAPI(c *gin.Context) {
	if proxyListRepo == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "db_unavailable"})
		return
	}
	go func() {
		if err := syncProxiesFromRemote(proxyListRepo); err != nil {
			logsdk.Error(context.TODO(), "[ProxyList] manual refresh sync failed", logsdk.Err(err))
		}
	}()
	c.JSON(http.StatusAccepted, gin.H{"status": "syncing"})
}

// ProxyListExportAPI 导出全部代理数据（CSV/TXT）
func ProxyListExportAPI(c *gin.Context) {
	if proxyListRepo == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "db_unavailable"})
		return
	}

	format := c.DefaultQuery("format", "csv")
	protocol := strings.ToLower(c.DefaultQuery("protocol", "all"))
	country := strings.ToUpper(c.DefaultQuery("country", "all"))
	anonymity := strings.ToLower(c.DefaultQuery("anonymity", "all"))

	filter := repository.ProxyFilter{
		Protocol:  protocol,
		Country:   country,
		Anonymity: anonymity,
		SortBy:    "latency",
		AliveOnly: true,
	}

	entities, err := proxyListRepo.ListAll(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db_error"})
		return
	}

	now := time.Now().Format("2006-01-02")
	switch format {
	case "txt":
		c.Header("Content-Type", "text/plain; charset=utf-8")
		c.Header("Content-Disposition", "attachment; filename=proxy-list-"+now+".txt")
		var b strings.Builder
		for _, e := range entities {
			b.WriteString(e.IP)
			b.WriteByte(':')
			b.WriteString(strconv.Itoa(e.Port))
			b.WriteByte('\n')
		}
		c.String(http.StatusOK, b.String())
	default:
		c.Header("Content-Type", "text/csv; charset=utf-8")
		c.Header("Content-Disposition", "attachment; filename=proxy-list-"+now+".csv")
		var b strings.Builder
		b.WriteString("IP,Port,Protocol,Country,Anonymity,Latency(ms),Uptime(%),Last Checked\n")
		for _, e := range entities {
			b.WriteString(fmt.Sprintf("%s,%d,%s,%s,%s,%d,%.0f,%s\n",
				e.IP, e.Port, e.Protocol, e.CountryName, e.Anonymity,
				e.LatencyMs, e.UptimePct, e.LastChecked.Format(time.RFC3339)))
		}
		c.String(http.StatusOK, b.String())
	}

	logsdk.Info(context.TODO(), "[ProxyList] export completed",
		logsdk.Any("format", format),
		logsdk.Any("protocol", protocol),
		logsdk.Any("count", len(entities)))
}

// ── JSONLD 构建 ──────────────────────────────────────────────────

func buildProxyListJSONLD(t func(string) string) template.JS {
	graph := map[string]interface{}{
		"@context": "https://schema.org",
		"@graph": []interface{}{
			map[string]interface{}{
				"@type":               "SoftwareApplication",
				"name":                t("proxy-list.seo.title"),
				"applicationCategory": "UtilityApplication",
				"operatingSystem":     "Web Browser",
				"url":                 "https://ycjson.top/proxy/list",
				"offers":              map[string]string{"@type": "Offer", "price": "0", "priceCurrency": "USD"},
				"description":         t("proxy-list.seo.desc"),
			},
		},
	}

	b, err := json.Marshal(graph)
	if err != nil {
		return template.JS("{}")
	}
	return template.JS(b)
}

// ── 后台同步（由 main.go 启动时调用） ───────────────────────────

// StartProxyListSyncLoop 启动定时同步 goroutine（每 30 分钟）
func StartProxyListSyncLoop(repo repository.ProxyRepository) {
	proxyListRepo = repo

	if err := syncProxiesFromRemote(repo); err != nil {
		logsdk.Error(context.TODO(), "[ProxyList] initial sync failed", logsdk.Err(err))
	} else {
		logsdk.Info(context.TODO(), "[ProxyList] initial sync completed")
	}

	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		if err := syncProxiesFromRemote(repo); err != nil {
			logsdk.Error(context.TODO(), "[ProxyList] periodic sync failed", logsdk.Err(err))
		} else {
			logsdk.Info(context.TODO(), "[ProxyList] periodic sync completed")
		}
	}
}

// syncProxiesFromRemote 从 proxyscrape API 拉取完整代理数据并 Upsert 到 MySQL
func syncProxiesFromRemote(repo repository.ProxyRepository) error {
	sources := []struct {
		url      string
		protocol entity.ProxyProtocol
	}{
		{
			"https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all&format=json",
			entity.ProxyProtocolHTTP,
		},
		{
			"https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=socks4&timeout=10000&country=all&format=json",
			entity.ProxyProtocolSOCKS4,
		},
		{
			"https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=socks5&timeout=10000&country=all&format=json",
			entity.ProxyProtocolSOCKS5,
		},
	}

	var all []entity.Proxy
	client := &http.Client{Timeout: 30 * time.Second}

	for _, src := range sources {
		resp, err := client.Get(src.url)
		if err != nil {
			logsdk.Error(context.TODO(), "[ProxyList] fetch failed", logsdk.Err(err), logsdk.Any("url", src.url))
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			logsdk.Error(context.TODO(), "[ProxyList] read body failed", logsdk.Err(err), logsdk.Any("url", src.url))
			continue
		}

		var items []proxyscrapeItem
		if err := json.Unmarshal(body, &items); err != nil {
			logsdk.Warn(context.TODO(), "[ProxyList] JSON parse failed, falling back to text",
				logsdk.Err(err), logsdk.Any("url", src.url))
			textProxies := parseTextProxies(string(body), src.protocol)
			logsdk.Info(context.TODO(), "[ProxyList] text fallback parsed",
				logsdk.Any("protocol", src.protocol), logsdk.Any("count", len(textProxies)))
			all = append(all, textProxies...)
			continue
		}

		logsdk.Info(context.TODO(), "[ProxyList] source parsed",
			logsdk.Any("protocol", src.protocol), logsdk.Any("count", len(items)))

		now := time.Now()
		for _, item := range items {
			ip := item.IP
			if !isValidIP(ip) {
				continue
			}
			port := item.Port
			if port <= 0 || port > 65535 {
				continue
			}

			protocol := src.protocol
			if item.Protocol != "" {
				switch strings.ToLower(item.Protocol) {
				case "http":
					protocol = entity.ProxyProtocolHTTP
				case "https", "ssl", "https_ssl":
					protocol = entity.ProxyProtocolHTTPS
				case "socks4":
					protocol = entity.ProxyProtocolSOCKS4
				case "socks5":
					protocol = entity.ProxyProtocolSOCKS5
				}
			}
			if protocol == entity.ProxyProtocolHTTP && item.SSL {
				protocol = entity.ProxyProtocolHTTPS
			}

			anon := mapAnonymity(item.Anonymity)

			latencyMs := item.Timeout
			if latencyMs <= 0 {
				latencyMs = item.Latency
			}

			uptimePct := estimateUptime(latencyMs)

			lastChecked := now
			if item.LastCheck > 0 {
				lastChecked = time.Unix(item.LastCheck, 0)
			}

			proxy := entity.Proxy{
				IP:          ip,
				Port:        port,
				Protocol:    protocol,
				CountryCode: strings.ToUpper(item.Code),
				CountryName: item.Country,
				Anonymity:   anon,
				LatencyMs:   latencyMs,
				UptimePct:   uptimePct,
				LastChecked: lastChecked,
				IsAlive:     true,
				Source:      "proxyscrape",
			}
			all = append(all, proxy)
		}
	}

	if len(all) == 0 {
		logsdk.Warn(context.TODO(), "[ProxyList] zero proxies fetched from all sources")
		return nil
	}

	logsdk.Info(context.TODO(), "[ProxyList] total proxies to upsert", logsdk.Any("count", len(all)))

	if err := repo.UpsertBatch(all); err != nil {
		logsdk.Error(context.TODO(), "[ProxyList] upsert failed", logsdk.Err(err))
		return err
	}

	logsdk.Info(context.TODO(), "[ProxyList] upsert completed", logsdk.Any("count", len(all)))
	return nil
}

// proxyscrapeItem proxyscrape JSON API 返回的代理数据结构
type proxyscrapeItem struct {
	IP        string `json:"ip"`
	Port      int    `json:"port"`
	Code      string `json:"code"`
	Country   string `json:"country"`
	Anonymity int    `json:"anonymous"`
	Type      string `json:"type"`
	SSL       bool   `json:"ssl"`
	Google    bool   `json:"google"`
	LastCheck int64  `json:"last_check"`
	Timeout   int    `json:"timeout"`
	Latency   int    `json:"latency"`
	Protocol  string `json:"protocol"`
	Alive     bool   `json:"alive"`
}

// mapAnonymity 将 proxyscrape 匿名度数值映射为枚举
func mapAnonymity(level int) entity.ProxyAnonymity {
	switch level {
	case 3:
		return entity.ProxyAnonymityElite
	case 1:
		return entity.ProxyAnonymityTransparent
	default:
		return entity.ProxyAnonymityAnonymous
	}
}

// estimateUptime 根据延迟估算在线率
func estimateUptime(latencyMs int) float32 {
	if latencyMs <= 0 {
		return 50
	}
	if latencyMs < 300 {
		return 95
	}
	if latencyMs < 1000 {
		return 85
	}
	if latencyMs < 3000 {
		return 70
	}
	if latencyMs < 5000 {
		return 55
	}
	return 40
}

// parseTextProxies 文本行格式回退解析（ip:port）
func parseTextProxies(body string, protocol entity.ProxyProtocol) []entity.Proxy {
	var proxies []entity.Proxy
	lines := strings.Split(body, "\n")
	now := time.Now()

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Split(line, ":")
		if len(parts) != 2 {
			continue
		}
		port, err := strconv.Atoi(parts[1])
		if err != nil || port <= 0 || port > 65535 {
			continue
		}
		ip := parts[0]
		if !isValidIP(ip) {
			continue
		}
		proxies = append(proxies, entity.Proxy{
			IP:          ip,
			Port:        port,
			Protocol:    protocol,
			CountryCode: "",
			CountryName: "",
			Anonymity:   entity.ProxyAnonymityAnonymous,
			LatencyMs:   0,
			UptimePct:   0,
			LastChecked: now,
			IsAlive:     true,
			Source:      "proxyscrape",
		})
	}
	return proxies
}

// isValidIP 简单校验 IP 地址格式
func isValidIP(ip string) bool {
	parts := strings.Split(ip, ".")
	if len(parts) == 4 {
		for _, p := range parts {
			n, err := strconv.Atoi(p)
			if err != nil || n < 0 || n > 255 {
				return false
			}
		}
		return true
	}
	if strings.Contains(ip, ":") && len(ip) >= 7 {
		return true
	}
	return false
}
