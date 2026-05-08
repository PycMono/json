package auth

import "context"

// OAuthUserInfo OAuth 提供商返回的用户信息
type OAuthUserInfo struct {
	Provider          string
	ProviderUserID    string
	Email             string
	EmailVerified     bool
	Name              string
	GivenName         string
	FamilyName        string
	AvatarURL         string
	Locale            string
	PreferredLanguage string
}

// OAuthProvider OAuth 提供商接口
type OAuthProvider interface {
	// BuildAuthURL 构建授权跳转 URL
	BuildAuthURL(state, codeVerifier, redirectURI string) string
	// ExchangeCode 用授权码换取用户信息
	ExchangeCode(ctx context.Context, code, codeVerifier, redirectURI string) (*OAuthUserInfo, error)
	// Name 返回提供商标识
	Name() string
}
