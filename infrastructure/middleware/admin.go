package middleware

import (
	"net/http"
	"strings"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/infrastructure/config"

	"github.com/gin-gonic/gin"
)

// AdminAuth 校验当前登录用户是否为管理员。
// 必须在 RequireAuth 之后使用（依赖 context 中的 authUser）。
func AdminAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authUser, exists := c.Get("authUser")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		user, ok := authUser.(*entity.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid_user"})
			c.Abort()
			return
		}

		adminEmails := cfg.Admin.Emails
		if cfg.Admin.EmailList != "" {
			adminEmails = strings.Split(cfg.Admin.EmailList, ",")
		}

		for _, email := range adminEmails {
			if strings.TrimSpace(email) == user.Email {
				c.Set("isAdmin", true)
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "admin_required"})
		c.Abort()
	}
}
