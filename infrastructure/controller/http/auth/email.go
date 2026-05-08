package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// SendEmailCode API: 发送邮箱验证码
// POST /api/auth/email/send-code
func SendEmailCode(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid email address",
		})
		return
	}

	if err := authService.SendEmailCode(c.Request.Context(), req.Email); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Verification code sent",
	})
}

// VerifyEmailCode API: 验证邮箱验证码并登录
// POST /api/auth/email/verify
func VerifyEmailCode(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid parameters",
		})
		return
	}

	sessionID, _, err := authService.VerifyEmailCode(c.Request.Context(), req.Email, req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 设置 session cookie
	setSessionCookie(c, sessionID)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"redirect": "/auth/me?login=1",
	})
}
