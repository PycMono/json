package middleware

import (
	"net"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// IPBlacklistMiddleware IP黑名单中间件
type IPBlacklistMiddleware struct {
	blackList map[string]bool // 精确IP黑名单
	cidrList  []*net.IPNet    // IP段黑名单
	grayList  map[string]int  // 可疑IP计数器
	mu        sync.RWMutex    // 读写锁
}

// IPBlacklistConfig IP黑名单配置
type IPBlacklistConfig struct {
	BlackList     []string `json:"ip_blacklist"`   // 精确IP列表
	CIDRList      []string `json:"ip_cidr"`        // IP段列表 (CIDR格式)
	AutoBlock     bool     `json:"auto_block"`     // 是否自动封禁
	GrayThreshold int      `json:"gray_threshold"` // 灰名单阈值（次数）
	BlockDuration int      `json:"block_duration"` // 自动封禁时长（分钟）
}

// NewIPBlacklistMiddleware 创建IP黑名单中间件实例
func NewIPBlacklistMiddleware(cfg *IPBlacklistConfig) *IPBlacklistMiddleware {
	m := &IPBlacklistMiddleware{
		blackList: make(map[string]bool),
		cidrList:  make([]*net.IPNet, 0),
		grayList:  make(map[string]int),
	}

	// 从配置加载黑名单
	if cfg != nil {
		m.LoadFromConfig(cfg)
	}

	return m
}

// LoadFromConfig 从配置加载IP黑名单
func (m *IPBlacklistMiddleware) LoadFromConfig(cfg *IPBlacklistConfig) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 加载精确IP黑名单
	for _, ip := range cfg.BlackList {
		m.blackList[ip] = true
	}

	// 加载IP段黑名单
	for _, cidr := range cfg.CIDRList {
		_, ipNet, err := net.ParseCIDR(cidr)
		if err == nil {
			m.cidrList = append(m.cidrList, ipNet)
		}
	}
}

// IsBlocked 检查IP是否被封禁
func (m *IPBlacklistMiddleware) IsBlocked(ipStr string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// 检查精确IP黑名单
	if m.blackList[ipStr] {
		return true
	}

	// 检查IP段黑名单
	ip := net.ParseIP(ipStr)
	if ip != nil {
		for _, ipNet := range m.cidrList {
			if ipNet.Contains(ip) {
				return true
			}
		}
	}

	return false
}

// AddToGraylist 添加IP到灰名单（可疑IP）
func (m *IPBlacklistMiddleware) AddToGraylist(ipStr string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.grayList[ipStr]++
}

// GetGrayCount 获取IP的灰名单计数
func (m *IPBlacklistMiddleware) GetGrayCount(ipStr string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.grayList[ipStr]
}

// RemoveFromGraylist 从灰名单移除IP
func (m *IPBlacklistMiddleware) RemoveFromGraylist(ipStr string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.grayList, ipStr)
}

// AddToBlacklist 添加IP到黑名单
func (m *IPBlacklistMiddleware) AddToBlacklist(ipStr string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.blackList[ipStr] = true
}

// RemoveFromBlacklist 从黑名单移除IP
func (m *IPBlacklistMiddleware) RemoveFromBlacklist(ipStr string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.blackList, ipStr)
}

// IPBlacklist 返回IP黑名单中间件处理函数
func (m *IPBlacklistMiddleware) IPBlacklist() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取客户端真实IP（考虑代理）
		ip := c.ClientIP()

		// 检查是否在黑名单中
		if m.IsBlocked(ip) {
			c.Header("X-Robots-Tag", "noindex, nofollow")
			c.String(http.StatusForbidden, "Access denied. Your IP has been blocked.")
			c.Abort()
			return
		}

		c.Next()
	}
}
