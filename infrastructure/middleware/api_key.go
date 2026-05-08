package middleware

import (
	cryptorand "crypto/rand"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// APIKeyStore manages API keys and their rate limits
type APIKeyStore struct {
	mu      sync.RWMutex
	keys    map[string]*APIKeyInfo // key -> info
	byUser  map[uint64]string      // userID -> key (for quick lookup)
}

// APIKeyInfo stores metadata about an API key
type APIKeyInfo struct {
	UserID      uint64
	Key         string
	Name        string
	RateLimit   int           // requests per minute
	CreatedAt   time.Time
	LastUsedAt  time.Time
	UsageCount  int64
	Requests    []time.Time   // recent request timestamps for rate limiting
}

// Global store instance
var apiKeyStore = &APIKeyStore{
	keys:   make(map[string]*APIKeyInfo),
	byUser: make(map[uint64]string),
}

// GenerateAPIKey creates a new API key for a user
func GenerateAPIKey(userID uint64, name string) string {
	apiKeyStore.mu.Lock()
	defer apiKeyStore.mu.Unlock()

	// Generate key: sk_live_ + 32 random chars
	key := "sk_live_" + generateRandomString(32)

	// Revoke existing key if any
	if oldKey, exists := apiKeyStore.byUser[userID]; exists {
		delete(apiKeyStore.keys, oldKey)
	}

	apiKeyStore.keys[key] = &APIKeyInfo{
		UserID:    userID,
		Key:       key,
		Name:      name,
		RateLimit: 60, // 60 requests per minute
		CreatedAt: time.Now(),
		Requests:  make([]time.Time, 0),
	}
	apiKeyStore.byUser[userID] = key

	return key
}

// GetAPIKey retrieves API key info
func GetAPIKey(key string) (*APIKeyInfo, bool) {
	apiKeyStore.mu.RLock()
	defer apiKeyStore.mu.RUnlock()
	info, exists := apiKeyStore.keys[key]
	return info, exists
}

// RevokeAPIKey revokes an API key
func RevokeAPIKey(userID uint64) bool {
	apiKeyStore.mu.Lock()
	defer apiKeyStore.mu.Unlock()

	if key, exists := apiKeyStore.byUser[userID]; exists {
		delete(apiKeyStore.keys, key)
		delete(apiKeyStore.byUser, userID)
		return true
	}
	return false
}

// CheckRateLimit checks if the request is within rate limit
func (k *APIKeyInfo) CheckRateLimit() bool {
	now := time.Now()
	windowStart := now.Add(-time.Minute)

	// Clean old requests and count recent ones
	recentCount := 0
	for _, t := range k.Requests {
		if t.After(windowStart) {
			recentCount++
		}
	}

	if recentCount >= k.RateLimit {
		return false
	}

	// Record this request
	k.Requests = append(k.Requests, now)
	// Clean old requests periodically (keep last 100)
	if len(k.Requests) > 100 {
		var newRequests []time.Time
		for _, t := range k.Requests {
			if t.After(windowStart) {
				newRequests = append(newRequests, t)
			}
		}
		k.Requests = newRequests
	}

	k.LastUsedAt = now
	k.UsageCount++
	return true
}

// APIKeyAuth middleware validates API key and applies rate limiting
func APIKeyAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract API key from header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "API key required. Use Authorization: Bearer <api_key>",
			})
			c.Abort()
			return
		}

		// Parse Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid Authorization header format. Use: Bearer <api_key>",
			})
			c.Abort()
			return
		}

		key := parts[1]
		info, exists := GetAPIKey(key)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "Invalid API key",
			})
			c.Abort()
			return
		}

		// Check rate limit
		if !info.CheckRateLimit() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limited",
				"message": "Rate limit exceeded. 60 requests per minute allowed.",
				"retry_after": 60,
			})
			c.Abort()
			return
		}

		// Store user info in context
		c.Set("api_key_user_id", info.UserID)
		c.Set("api_key_info", info)

		c.Next()
	}
}

// generateRandomString generates a cryptographically secure random alphanumeric string
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		idx, _ := cryptorand.Int(cryptorand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[idx.Int64()]
	}
	return string(b)
}
