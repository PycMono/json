package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// HoneypotMiddleware Honeypot陷阱中间件
type HoneypotMiddleware struct {
	trapIPs      map[string]time.Time // 被陷阱捕获的IP及捕获时间
	mu           sync.RWMutex
	enabled      bool
}

// NewHoneypotMiddleware 创建Honeypot中间件实例
func NewHoneypotMiddleware(enabled bool) *HoneypotMiddleware {
	return &HoneypotMiddleware{
		trapIPs: make(map[string]time.Time),
		enabled: enabled,
	}
}

// IsTrapped 检查IP是否被陷阱捕获
func (m *HoneypotMiddleware) IsTrapped(ip string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	_, trapped := m.trapIPs[ip]
	return trapped
}

// AddToTrap 添加IP到陷阱列表
func (m *HoneypotMiddleware) AddToTrap(ip string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.trapIPs[ip] = time.Now()
}

// RemoveFromTrap 从陷阱列表移除IP
func (m *HoneypotMiddleware) RemoveFromTrap(ip string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.trapIPs, ip)
}

// CleanupOldTraps 清理超过24小时的陷阱记录
func (m *HoneypotMiddleware) CleanupOldTraps() {
	m.mu.Lock()
	defer m.mu.Unlock()

	cutoff := time.Now().Add(-24 * time.Hour)
	for ip, trappedTime := range m.trapIPs {
		if trappedTime.Before(cutoff) {
			delete(m.trapIPs, ip)
		}
	}
}

// GetTrappedIPs 获取所有被陷阱捕获的IP
func (m *HoneypotMiddleware) GetTrappedIPs() map[string]time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string]time.Time)
	for ip, t := range m.trapIPs {
		result[ip] = t
	}
	return result
}

// HoneypotInjector 在响应中注入隐藏的陷阱链接
func (m *HoneypotMiddleware) HoneypotInjector() gin.HandlerFunc {
	if !m.enabled {
		return func(c *gin.Context) {
			c.Next()
		}
	}

	// 定期清理旧记录
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			m.CleanupOldTraps()
		}
	}()

	return func(c *gin.Context) {
		c.Next()

		// 只对HTML响应注入陷阱链接
		if c.Writer.Status() == http.StatusOK &&
		   c.GetHeader("Content-Type") != "" &&
		   (strings.Contains(c.GetHeader("Content-Type"), "text/html") ||
		    strings.Contains(c.GetHeader("Content-Type"), "application/xhtml")) {

			// 生成多个陷阱链接
			trapLinks := m.generateTrapLinks(c.Request.Host)

			// 注入到响应末尾
			c.Writer.WriteString(trapLinks)
		}
	}
}

// generateTrapLinks 生成陷阱链接
func (m *HoneypotMiddleware) generateTrapLinks(host string) string {
	// 生成多个隐藏的陷阱链接
	links := []string{
		fmt.Sprintf(`<a href="http://%s/.well-known/trap" style="display:none">trap</a>`, host),
		fmt.Sprintf(`<a href="http://%s/api/.hidden/trap" style="display:none">trap</a>`, host),
		fmt.Sprintf(`<a href="http://%s/hidden/link/trap" style="display:none">trap</a>`, host),
		fmt.Sprintf(`<a href="http://%s/wp-content/trap.php" style="display:none">trap</a>`, host),
		fmt.Sprintf(`<a href="http://%s/xmlrpc.php" style="display:none">trap</a>`, host),
		fmt.Sprintf(`<a href="http://%s/admin/config" style="display:none">trap</a>`, host),
		fmt.Sprintf(`<a href="http://%s/secret/backup" style="display:none">trap</a>`, host),
		fmt.Sprintf(`<link rel="stylesheet" href="http://%s/.hidden/trap.css">`, host),
	}

	return strings.Join(links, "\n")
}

// HoneypotTrap 处理陷阱链接访问
func (m *HoneypotMiddleware) HoneypotTrap() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		// 记录访问陷阱的IP
		m.AddToTrap(ip)

		// 返回404，不暴露任何信息给扫描器
		c.AbortWithStatus(http.StatusNotFound)
	}
}

// GetHoneypotLinksForPage 获取页面中注入的Honeypot链接（供模板使用）
func (m *HoneypotMiddleware) GetHoneypotLinksForPage(host string) string {
	if !m.enabled {
		return ""
	}
	return m.generateTrapLinks(host)
}
