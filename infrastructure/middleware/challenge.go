package middleware

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// ChallengeMiddleware 挑战验证中间件
type ChallengeMiddleware struct {
	enabled       bool
	siteKey       string
	secretKey     string
	mu            sync.RWMutex
	verifiedIPs   map[string]time.Time // IP -> verification expiry
}

// NewChallengeMiddleware 创建挑战验证中间件实例
func NewChallengeMiddleware(enabled bool, siteKey, secretKey string) *ChallengeMiddleware {
	return &ChallengeMiddleware{
		enabled:     enabled,
		siteKey:     siteKey,
		secretKey:   secretKey,
		verifiedIPs: make(map[string]time.Time),
	}
}

// GenerateChallenge 生成挑战HTML
func (m *ChallengeMiddleware) GenerateChallenge(c *gin.Context) string {
	if !m.enabled {
		return ""
	}

	widgetID := fmt.Sprintf("turnstile_%s", generateRandomID(8))

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Security Challenge</title>
	<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
	<script>
		turnstile.ready(function() {
			turnstile.execute('#%s', {
				sitekey: '%s',
				callback: function(token) {
					// Turnstile验证通过，发送token到后端
					fetch('/api/security/challenge/verify', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({token: token}),
					}).then(response => response.json()).then(data => {
						if (data.success) {
							// 验证通过，允许访问
							window.location.reload();
						}
					});
				},
				'error': function(error) {
					console.error('Turnstile error:', error);
					document.getElementById('challenge-error').style.display = 'block';
				}
			});
		});
	</script>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
			min-height: 100vh;
			display: flex;
			justify-content: center;
			align-items: center;
		}
		.container {
			max-width: 400px;
			width: 100%%;
			padding: 40px 20px;
		}
		.challenge-box {
			background: white;
			border-radius: 12px;
			padding: 32px;
			box-shadow: 0 10px 40px rgba(0,0,0,0.1);
		}
		.challenge-title {
			font-size: 20px;
			font-weight: 600;
			color: #1e293b;
			margin-bottom: 16px;
		}
		.challenge-desc {
			color: #64748b;
			font-size: 14px;
			margin-bottom: 24px;
			line-height: 1.6;
		}
		.loading {
			display: inline-block;
			width: 20px;
			height: 20px;
			border: 3px solid #e0e0e0;
			border-top-color: #667eea;
			border-radius: 50%%;
			animation: spin 1s linear infinite;
			margin-left: 10px;
		}
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="challenge-box">
			<h1 class="challenge-title">🔒 Security Check Required</h1>
			<p class="challenge-desc">
				Please verify you are a human to continue accessing this site.<br>
				This helps us prevent automated scraping and AI training data collection.
			</p>
			<div id="challenge-status" style="margin-top: 20px;">
				<div class="loading"></div>
				<span style="color: #667eea;">Verifying...</span>
			</div>
			<div id="challenge-error" style="display: none; margin-top: 16px; color: #dc2626; font-size: 14px; background: #fee2e2; padding: 12px; border-radius: 8px;">
				Verification failed. Please try again.
			</div>
		</div>
	</div>
</body>
</html>
	`, widgetID, m.siteKey)
}

// generateRandomID 生成随机ID
func generateRandomID(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}

// IsVerified 检查IP是否已验证
func (m *ChallengeMiddleware) IsVerified(ip string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	expiry, ok := m.verifiedIPs[ip]
	if !ok {
		return false
	}

	// Check if verification is still valid (30 days)
	if time.Now().After(expiry) {
		return false
	}

	return true
}

// MarkVerified 标记IP为已验证
func (m *ChallengeMiddleware) MarkVerified(ip string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.verifiedIPs[ip] = time.Now().Add(30 * 24 * time.Hour)
}

// VerifyTurnstileToken verifies the Turnstile token with Cloudflare API
func (m *ChallengeMiddleware) VerifyTurnstileToken(token, ip string) (bool, error) {
	if m.secretKey == "" {
		// If no secret key configured, fail verification
		return false, fmt.Errorf("turnstile secret key not configured")
	}

	// Call Cloudflare Turnstile verification API
	apiURL := "https://challenges.cloudflare.com/turnstile/v0/siteverify"
	data := url.Values{
		"secret":   {m.secretKey},
		"response": {token},
		"remoteip": {ip},
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.PostForm(apiURL, data)
	if err != nil {
		return false, fmt.Errorf("failed to call turnstile API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024))
	if err != nil {
		return false, fmt.Errorf("failed to read response: %w", err)
	}

	var result struct {
		Success bool `json:"success"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return false, fmt.Errorf("failed to parse response: %w", err)
	}

	return result.Success, nil
}

// Challenge 返回挑战验证中间件处理函数
func (m *ChallengeMiddleware) Challenge() gin.HandlerFunc {
	if !m.enabled {
		return func(c *gin.Context) {
			c.Next()
		}
	}

	return func(c *gin.Context) {
		ip := c.ClientIP()

		// Check if already verified
		if m.IsVerified(ip) {
			c.Next()
			return
		}

		// Check if IP is in honeypot trap list via API call
		resp, err := http.Get(fmt.Sprintf("http://%s/api/security/honeypot/check?ip=%s", c.Request.Host, ip))
		if err != nil {
			// On error, allow through (fail open for better UX)
			c.Next()
			return
		}
		defer resp.Body.Close()

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err == nil {
			if trapped, ok := result["trapped"].(bool); ok && trapped {
				// IP被陷阱捕获，返回挑战页面
				c.Header("Content-Type", "text/html; charset=utf-8")
				c.String(http.StatusOK, m.GenerateChallenge(c))
				c.Abort()
				return
			}
		}

		// IP未被捕获，继续正常请求
		c.Next()
	}
}
