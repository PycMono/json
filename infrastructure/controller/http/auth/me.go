package auth

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"PycMono/github/json/infrastructure/controller/http/render"
)

// MePage 用户中心页
func MePage(c *gin.Context) {
	t := render.GetT(c)

	// 从 cookie 获取 session
	cookieName := authService.GetSessionCookieName()
	sessionID, err := c.Cookie(cookieName)
	if err != nil || sessionID == "" {
		c.Redirect(http.StatusFound, "/auth/login?redirect=/auth/me")
		return
	}

	// 获取用户
	user, err := authService.GetUser(c.Request.Context(), sessionID)
	if err != nil {
		c.Redirect(http.StatusFound, "/auth/login?redirect=/auth/me")
		return
	}

	// 获取绑定的 Provider
	providers, _ := authService.GetLinkedProviders(c.Request.Context(), user.ID)

	// 是否刚登录
	justLoggedIn := c.Query("login") == "1"

	data := render.BaseData(c, gin.H{
		"Title":           t("auth.me.title") + " | json",
		"Description":     t("auth.me.description"),
		"PageClass":       "page-auth-me",
		"User":            user,
		"LinkedProviders": providers,
		"JustLoggedIn":    justLoggedIn,
	})

	render.Render(c, "auth/me.html", data)
}

// GetUserFromContext 从 Gin context 获取当前用户（供其他 handler 使用）
func GetUserFromContext(c *gin.Context) (userID uint64, ok bool) {
	val, exists := c.Get("authUserID")
	if !exists {
		return 0, false
	}
	userID, ok = val.(uint64)
	return userID, ok
}

// RequireAuth 中间件：强制登录
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		cookieName := authService.GetSessionCookieName()
		sessionID, err := c.Cookie(cookieName)
		if err != nil || sessionID == "" {
			c.Redirect(http.StatusFound, "/auth/login?redirect="+c.Request.URL.Path)
			c.Abort()
			return
		}

		user, err := authService.GetUser(c.Request.Context(), sessionID)
		if err != nil {
			c.Redirect(http.StatusFound, "/auth/login")
			c.Abort()
			return
		}

		c.Set("authUser", user)
		c.Set("authUserID", user.ID)
		c.Set("sessionID", sessionID)
		c.Next()
	}
}

// OptionalAuth 中间件：可选登录（不强制）
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		cookieName := authService.GetSessionCookieName()
		sessionID, err := c.Cookie(cookieName)
		if err != nil || sessionID == "" {
			c.Next()
			return
		}

		user, err := authService.GetUser(c.Request.Context(), sessionID)
		if err != nil {
			c.Next()
			return
		}

		c.Set("authUser", user)
		c.Set("authUserID", strconv.FormatUint(user.ID, 10))
		c.Set("sessionID", sessionID)
		// For template rendering
		c.Set("AuthUserName", user.Name)
		c.Set("AuthAvatarURL", user.AvatarURL)
		c.Set("IsAuthenticated", true)
		c.Next()
	}
}
