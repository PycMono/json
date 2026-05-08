package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/microsoft"

	"PycMono/github/json/infrastructure/config"

	logsdk "github.com/PycMono/go-logger-sdk"
)

// MicrosoftProvider Microsoft OAuth 提供商
type MicrosoftProvider struct {
	config *oauth2.Config
}

func NewMicrosoftProvider(cfg config.MicrosoftOAuthConfig) *MicrosoftProvider {
	endpoint := microsoft.AzureADEndpoint(cfg.Tenant)
	return &MicrosoftProvider{
		config: &oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			Scopes:       []string{"openid", "email", "profile", "offline_access"},
			Endpoint:     endpoint,
		},
	}
}

func (p *MicrosoftProvider) Name() string { return "microsoft" }

func (p *MicrosoftProvider) BuildAuthURL(state, codeVerifier, redirectURI string) string {
	p.config.RedirectURL = redirectURI
	opts := []oauth2.AuthCodeOption{
		oauth2.SetAuthURLParam("code_challenge", codeVerifierToChallenge(codeVerifier)),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
	}
	return p.config.AuthCodeURL(state, opts...)
}

func (p *MicrosoftProvider) ExchangeCode(ctx context.Context, code, codeVerifier, redirectURI string) (*OAuthUserInfo, error) {
	p.config.RedirectURL = redirectURI

	token, err := p.config.Exchange(ctx, code,
		oauth2.SetAuthURLParam("code_verifier", codeVerifier),
	)
	if err != nil {
		return nil, fmt.Errorf("microsoft token exchange failed: %w", err)
	}

	// ① 优先从 ID token 提取 email（最可靠，个人/工作账号都支持）
	emailFromToken := extractEmailFromIDToken(token)

	// ② 调用 Microsoft Graph API 获取完整用户信息
	client := p.config.Client(ctx, token)
	resp, err := client.Get("https://graph.microsoft.com/v1.0/me")
	if err != nil {
		return nil, fmt.Errorf("microsoft graph request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("microsoft graph read failed: %w", err)
	}

	var me struct {
		ID                string `json:"id"`
		DisplayName       string `json:"displayName"`
		GivenName         string `json:"givenName"`
		Surname           string `json:"surname"`
		Mail              string `json:"mail"`
		UserPC            string `json:"userPrincipalName"`
		PreferredLanguage string `json:"preferredLanguage"`
	}
	if err := json.Unmarshal(body, &me); err != nil {
		return nil, fmt.Errorf("microsoft graph parse failed: %w", err)
	}

	// ③ 邮箱优先级：ID token > Graph mail > Graph userPrincipalName
	email := emailFromToken
	if email == "" {
		email = me.Mail
	}
	if email == "" {
		email = me.UserPC
	}
	if email == "" {
		logsdk.Error(ctx, "[Auth] Microsoft 账号无邮箱",
			logsdk.Any("id_token_email", emailFromToken),
			logsdk.Any("graph_mail", me.Mail),
			logsdk.Any("graph_upn", me.UserPC),
			logsdk.Any("graph_id", me.ID),
			logsdk.Any("graph_body", string(body)),
		)
		return nil, fmt.Errorf("microsoft account has no email address")
	}

	return &OAuthUserInfo{
		Provider:          "microsoft",
		ProviderUserID:    me.ID,
		Email:             normalizeEmail(email),
		EmailVerified:     true,
		Name:              me.DisplayName,
		GivenName:         me.GivenName,
		FamilyName:        me.Surname,
		AvatarURL:         "",
		Locale:            me.PreferredLanguage,
		PreferredLanguage: me.PreferredLanguage,
	}, nil
}

// extractEmailFromIDToken 从 OAuth2 token 的 id_token 中提取 email claim
// ID token 是 JWT 格式，payload 中包含 email 字段（需 openid + email scope）
func extractEmailFromIDToken(token *oauth2.Token) string {
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return ""
	}

	parts := strings.Split(rawIDToken, ".")
	if len(parts) < 2 {
		return ""
	}

	// JWT payload 是第二段（base64url 编码）
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}

	var claims struct {
		Email string `json:"email"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}

	return claims.Email
}
