package auth

import (
	"PycMono/github/json/infrastructure/controller/http/render"
	"github.com/gin-gonic/gin"
)

// LoginPage 登录页
func LoginPage(c *gin.Context) {
	t := render.GetT(c)

	data := render.BaseData(c, gin.H{
		"Title":       t("auth.login.title") + " | json",
		"Description": t("auth.login.description"),
		"PageClass":   "page-auth-login",
	})

	render.Render(c, "auth/login.html", data)
}
