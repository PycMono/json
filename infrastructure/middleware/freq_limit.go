package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// FreqLimitMiddleware 频率限制中间件
type FreqLimitMiddleware struct {
	htmlLimit    int           // HTML页面请求限制（每分钟）
	staticLimit  int           // 静态资源请求限制（每分钟）
	window       time.Duration // 时间窗口
	requests     map[string]*IPRequestRecord
	mu           sync.RWMutex
}

// IPRequestRecord IP请求记录
type IPRequestRecord struct {
	HTMLCount    int
	StaticCount  int
	WindowStart  time.Time
	mu           sync.Mutex
}

// FreqLimitConfig 频率限制配置
type FreqLimitConfig struct {
	HTMLLimit   int    `json:"html_limit"`   // HTML页面限制
	StaticLimit int    `json:"static_limit"` // 静态资源限制
	WindowSecs  int    `json:"window_secs"`  // 时间窗口（秒）
}

// NewFreqLimitMiddleware 创建频率限制中间件
func NewFreqLimitMiddleware(cfg *FreqLimitConfig) *FreqLimitMiddleware {
	htmlLimit := 60
	staticLimit := 200
	window := 60 * time.Second

	if cfg != nil {
		if cfg.HTMLLimit > 0 {
			htmlLimit = cfg.HTMLLimit
		}
		if cfg.StaticLimit > 0 {
			staticLimit = cfg.StaticLimit
		}
		if cfg.WindowSecs > 0 {
			window = time.Duration(cfg.WindowSecs) * time.Second
		}
	}

	return &FreqLimitMiddleware{
		htmlLimit:   htmlLimit,
		staticLimit: staticLimit,
		window:      window,
		requests:    make(map[string]*IPRequestRecord),
	}
}

// checkRequest 检查并记录请求
func (m *FreqLimitMiddleware) checkRequest(ip string, isStatic bool) bool {
	m.mu.Lock()
	record, exists := m.requests[ip]
	if !exists {
		record = &IPRequestRecord{
			WindowStart: time.Now(),
		}
		m.requests[ip] = record
	}
	m.mu.Unlock()

	record.mu.Lock()
	defer record.mu.Unlock()

	// 检查窗口是否已过期，如果过期则重置
	if time.Since(record.WindowStart) > m.window {
		record.HTMLCount = 0
		record.StaticCount = 0
		record.WindowStart = time.Now()
	}

	// 根据请求类型计数
	if isStatic {
		record.StaticCount++
		if record.StaticCount > m.staticLimit {
			return false
		}
	} else {
		record.HTMLCount++
		if record.HTMLCount > m.htmlLimit {
			return false
		}
	}

	return true
}

// cleanupExpiredRecords 清理过期的IP记录
func (m *FreqLimitMiddleware) cleanupExpiredRecords() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for ip, record := range m.requests {
		record.mu.Lock()
		if now.Sub(record.WindowStart) > m.window*10 {
			delete(m.requests, ip)
		}
		record.mu.Unlock()
	}
}

// FreqLimit 返回频率限制中间件处理函数
func (m *FreqLimitMiddleware) FreqLimit() gin.HandlerFunc {
	// 定期清理过期记录（每5分钟）
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			m.cleanupExpiredRecords()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()

		// 判断是否为静态资源请求
		isStatic := false
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/static/") ||
		   strings.HasPrefix(path, "/css/") ||
		   strings.HasPrefix(path, "/js/") ||
		   strings.HasPrefix(path, "/img/") ||
		   strings.HasPrefix(path, "/fonts/") ||
		   strings.HasSuffix(path, ".css") ||
		   strings.HasSuffix(path, ".js") ||
		   strings.HasSuffix(path, ".png") ||
		   strings.HasSuffix(path, ".jpg") ||
		   strings.HasSuffix(path, ".jpeg") ||
		   strings.HasSuffix(path, ".gif") ||
		   strings.HasSuffix(path, ".svg") ||
		   strings.HasSuffix(path, ".ico") ||
		   strings.HasSuffix(path, ".woff") ||
		   strings.HasSuffix(path, ".woff2") {
			isStatic = true
		}

		// 检查请求频率
		if !m.checkRequest(ip, isStatic) {
			c.Header("X-RateLimit-Limit", "true")
			c.Header("Retry-After", "60")
			c.String(http.StatusTooManyRequests,
				"Too many requests. Please slow down. Rate limit: "+
					formatLimit(m.htmlLimit, m.staticLimit, m.window))
			c.Abort()
			return
		}

		c.Next()
	}
}

// formatLimit 格式化限制信息
func formatLimit(html, static int, window time.Duration) string {
	return fmt.Sprintf("%d HTML/%d static pages per %s",
		html, static, window.String())
}

// GetGrayListCandidates 获取灰名单候选IP（超过阈值80%的IP）
func (m *FreqLimitMiddleware) GetGrayListCandidates(threshold float64) []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var candidates []string
	htmlThreshold := int(float64(m.htmlLimit) * threshold)

	for ip, record := range m.requests {
		record.mu.Lock()
		if record.HTMLCount >= htmlThreshold {
			candidates = append(candidates, ip)
		}
		record.mu.Unlock()
	}

	return candidates
}
