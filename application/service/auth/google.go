package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"PycMono/github/json/infrastructure/config"
)

// GoogleProvider Google OAuth 提供商
type GoogleProvider struct {
	config *oauth2.Config
}

func NewGoogleProvider(cfg config.GoogleOAuthConfig) *GoogleProvider {
	return &GoogleProvider{
		config: &oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		},
	}
}

func (p *GoogleProvider) Name() string { return "google" }

func (p *GoogleProvider) BuildAuthURL(state, codeVerifier, redirectURI string) string {
	p.config.RedirectURL = redirectURI
	opts := []oauth2.AuthCodeOption{
		oauth2.SetAuthURLParam("code_challenge", codeVerifierToChallenge(codeVerifier)),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "consent"),
	}
	return p.config.AuthCodeURL(state, opts...)
}

func (p *GoogleProvider) ExchangeCode(ctx context.Context, code, codeVerifier, redirectURI string) (*OAuthUserInfo, error) {
	p.config.RedirectURL = redirectURI

	token, err := p.config.Exchange(ctx, code,
		oauth2.SetAuthURLParam("code_verifier", codeVerifier),
	)
	if err != nil {
		return nil, fmt.Errorf("google token exchange failed: %w", err)
	}

	// 调用 userinfo 端点
	client := p.config.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		return nil, fmt.Errorf("google userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("google userinfo read failed: %w", err)
	}

	var userinfo struct {
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		GivenName     string `json:"given_name"`
		FamilyName    string `json:"family_name"`
		Picture       string `json:"picture"`
		Locale        string `json:"locale"`
	}
	if err := json.Unmarshal(body, &userinfo); err != nil {
		return nil, fmt.Errorf("google userinfo parse failed: %w", err)
	}

	return &OAuthUserInfo{
		Provider:          "google",
		ProviderUserID:    userinfo.Sub,
		Email:             userinfo.Email,
		EmailVerified:     userinfo.EmailVerified,
		Name:              userinfo.Name,
		GivenName:         userinfo.GivenName,
		FamilyName:        userinfo.FamilyName,
		AvatarURL:         userinfo.Picture,
		Locale:            userinfo.Locale,
		PreferredLanguage: userinfo.Locale,
	}, nil
}
