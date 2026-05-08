package auth

import (
	"PycMono/github/json/application/service/auth"
)

// authService 全局 AuthService 实例
var authService *auth.AuthService

// SetAuthService 注入 AuthService（main.go 调用）
func SetAuthService(svc *auth.AuthService) {
	authService = svc
}
