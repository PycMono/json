package http

import (
	"PycMono/github/json/infrastructure/middleware"
	"github.com/gin-gonic/gin"
	"net/http"
)

// honeypotCheckHandler 检查IP是否被Honeypot捕获
func honeypotCheckHandler(honeypot *middleware.HoneypotMiddleware) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.Query("ip")
		if ip == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "IP parameter required"})
			return
		}

		trapped := honeypot.IsTrapped(ip)
		c.JSON(http.StatusOK, gin.H{
			"trapped": trapped,
		})
	}
}

// honeypotRemoveHandler 从Honeypot列表移除IP
func honeypotRemoveHandler(honeypot *middleware.HoneypotMiddleware) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			IP string `json:"ip" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		honeypot.RemoveFromTrap(req.IP)
		c.JSON(http.StatusOK, gin.H{
			"success": true,
		})
	}
}

// challengeVerifyHandler 验证Turnstile挑战
func challengeVerifyHandler(challenge *middleware.ChallengeMiddleware, ipBlacklist *middleware.IPBlacklistMiddleware, honeypot *middleware.HoneypotMiddleware) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Token string `json:"token" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ip := c.ClientIP()

		// Verify Turnstile token with Cloudflare API
		valid, err := challenge.VerifyTurnstileToken(req.Token, ip)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Verification failed: " + err.Error()})
			return
		}
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid token"})
			return
		}

		// Mark IP as verified in challenge middleware
		challenge.MarkVerified(ip)

		// Remove IP from Honeypot trap list
		honeypot.RemoveFromTrap(ip)

		// Remove IP from IP blacklist graylist (if present)
		ipBlacklist.RemoveFromGraylist(ip)

		// Set a cookie to mark this IP as verified (client-side backup)
		c.SetCookie(
			"challenge_verified",
			"true",
			3600*24*30, // 30 days
			"/",
			"",
			false,
			true,
		)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
		})
	}
}
