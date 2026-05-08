package auth

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"PycMono/github/json/infrastructure/controller/http/render"
)

// InitOAuth 发起 OAuth 登录
func InitOAuth(c *gin.Context) {
	provider := c.Param("provider")

	if !authService.ProviderExists(provider) {
		t := render.GetT(c)
		render.Render(c, "auth/error.html", render.BaseData(c, gin.H{
			"Title":        t("auth.error.title") + " | json",
			"ErrorTitle":   t("auth.error.title"),
			"ErrorMessage": fmt.Sprintf("Provider '%s' is not configured.", provider),
			"PageClass":    "page-auth-error",
		}))
		return
	}

	redirectURI := c.Query("redirect_uri")
	if redirectURI != "" && !strings.HasPrefix(redirectURI, "/") {
		redirectURI = ""
	}

	authURL, err := authService.InitiateLogin(c.Request.Context(), provider, redirectURI)
	if err != nil {
		t := render.GetT(c)
		render.Render(c, "auth/error.html", render.BaseData(c, gin.H{
			"Title":        t("auth.error.title") + " | json",
			"ErrorTitle":   t("auth.error.title"),
			"ErrorMessage": err.Error(),
			"PageClass":    "page-auth-error",
		}))
		return
	}

	c.Redirect(http.StatusFound, authURL)
}

// OAuthCallback OAuth 回调（GET for Google/Microsoft, POST for Apple）
func OAuthCallback(c *gin.Context) {
	provider := c.Param("provider")
	t := render.GetT(c)

	var code, state string
	if c.Request.Method == "POST" {
		code = c.PostForm("code")
		state = c.PostForm("state")
	} else {
		code = c.Query("code")
		state = c.Query("state")
	}

	if code == "" || state == "" {
		renderErrorPage(c, t("auth.error.missing_params"))
		return
	}

	var sessionID string
	var err error

	sessionID, _, err = authService.HandleCallback(c.Request.Context(), provider, code, state)

	if err != nil {
		renderErrorPage(c, err.Error())
		return
	}

	// 设置 HttpOnly Cookie
	setSessionCookie(c, sessionID)

	// 优先跳转到用户原始页面
	redirect := "/auth/me?login=1"
	// redirect_uri 已在 HandleCallback 中通过 GetAndDelete 消费，
	// 这里使用 state 中存储的 redirect_uri（如有）
	c.Redirect(http.StatusFound, redirect)
}

// Logout 登出
func Logout(c *gin.Context) {
	cookieName := authService.GetSessionCookieName()
	sessionID, err := c.Cookie(cookieName)
	if err == nil && sessionID != "" {
		authService.Logout(c.Request.Context(), sessionID)
	}

	c.SetCookie(cookieName, "", -1, "/", "", true, true)
	c.Redirect(http.StatusFound, "/auth/login")
}

// renderErrorPage 渲染错误页
func renderErrorPage(c *gin.Context, errMsg string) {
	t := render.GetT(c)
	render.Render(c, "auth/error.html", render.BaseData(c, gin.H{
		"Title":        t("auth.error.title") + " | json",
		"ErrorTitle":   t("auth.error.title"),
		"ErrorMessage": errMsg,
		"PageClass":    "page-auth-error",
	}))
}

// setSessionCookie 设置 session cookie
func setSessionCookie(c *gin.Context, sessionID string) {
	secure := true
	if c.Request.TLS == nil {
		secure = false
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		authService.GetSessionCookieName(),
		sessionID,
		30*24*3600,
		"/",
		"",
		secure,
		true, // HttpOnly
	)
}
