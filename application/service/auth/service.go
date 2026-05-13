package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strconv"
	"sync"
	"time"

	logsdk "github.com/PycMono/go-logger-sdk"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"
	"PycMono/github/json/infrastructure/config"
)

// ─── Provider Factory (Strategy + Factory, 参考 ai/mgr.go) ──────────────

// ProviderFactory OAuth 提供商工厂（单例）
type ProviderFactory struct {
	providers map[string]OAuthProvider
	mu        sync.RWMutex
}

var (
	factory     *ProviderFactory
	factoryOnce sync.Once
)

// RegisterProvider 注册一个 OAuth 提供商
func (f *ProviderFactory) RegisterProvider(name string, p OAuthProvider) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.providers[name] = p
	logsdk.Info(context.TODO(), "[Auth] 注册 OAuth 提供商", logsdk.Any("provider", name))
}

// GetProvider 获取指定 provider
func (f *ProviderFactory) GetProvider(name string) (OAuthProvider, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	p, ok := f.providers[name]
	if !ok {
		return nil, fmt.Errorf("unsupported provider: %s", name)
	}
	return p, nil
}

// ProviderExists 检查 provider 是否已注册
func (f *ProviderFactory) ProviderExists(name string) bool {
	f.mu.RLock()
	defer f.mu.RUnlock()
	_, ok := f.providers[name]
	return ok
}

// ListProviders 返回所有已注册的 provider 名称
func (f *ProviderFactory) ListProviders() []string {
	f.mu.RLock()
	defer f.mu.RUnlock()
	names := make([]string, 0, len(f.providers))
	for name := range f.providers {
		names = append(names, name)
	}
	return names
}

// GetFactory 获取工厂单例
func GetFactory() *ProviderFactory {
	if factory == nil {
		factoryOnce.Do(func() {
			factory = &ProviderFactory{
				providers: make(map[string]OAuthProvider),
			}
		})
	}
	return factory
}

// ─── Auth Service (编排层) ───────────────────────────────────────────────

// AuthService OAuth 认证编排服务
type AuthService struct {
	factory       *ProviderFactory
	userRepo      repository.IUserRepository
	oauthRepo     repository.IOAuthAccountRepository
	sessionRepo   repository.ISessionRepository
	stateRepo     repository.IOAuthStateRepository
	emailCodeRepo repository.IEmailCodeRepository
	emailSender   repository.IEmailSender
	cfg           config.OAuthConfig
	tokenSvc      TokenGrantService // optional, set via SetTokenService
}

// TokenGrantService Token 赠送接口（由 token service 实现）
type TokenGrantService interface {
	RegisterGrant(ctx context.Context, userID string) error
}

// SetTokenService 注入 Token 服务（可选）
func (s *AuthService) SetTokenService(svc TokenGrantService) {
	s.tokenSvc = svc
}

func NewAuthService(
	cfg config.OAuthConfig,
	userRepo repository.IUserRepository,
	oauthRepo repository.IOAuthAccountRepository,
	sessionRepo repository.ISessionRepository,
	stateRepo repository.IOAuthStateRepository,
	emailCodeRepo repository.IEmailCodeRepository,
	emailSender repository.IEmailSender,
) *AuthService {
	f := GetFactory()

	// 根据配置自动注册 providers（工厂模式 — 配置驱动）
	register := func(name string, newFn func() OAuthProvider) {
		p := newFn()
		f.RegisterProvider(name, p)
	}

	if cfg.Google.ClientID != "" {
		register("google", func() OAuthProvider { return NewGoogleProvider(cfg.Google) })
	}
	if cfg.Microsoft.ClientID != "" {
		register("microsoft", func() OAuthProvider { return NewMicrosoftProvider(cfg.Microsoft) })
	}

	return &AuthService{
		factory:       f,
		userRepo:      userRepo,
		oauthRepo:     oauthRepo,
		sessionRepo:   sessionRepo,
		stateRepo:     stateRepo,
		emailCodeRepo: emailCodeRepo,
		emailSender:   emailSender,
		cfg:           cfg,
	}
}

// ProviderExists 检查 provider 是否已配置
func (s *AuthService) ProviderExists(name string) bool {
	return s.factory.ProviderExists(name)
}

// InitiateLogin 发起 OAuth 登录
func (s *AuthService) InitiateLogin(ctx context.Context, providerName, redirectURI string) (string, error) {
	provider, err := s.factory.GetProvider(providerName)
	if err != nil {
		return "", err
	}

	// 生成 state（64 字节 hex = 128 字符）
	state := generateRandomHex(64)

	// 生成 PKCE code_verifier
	codeVerifier := generateRandomHex(32)

	// 存储 state 到 Redis
	callbackURL := s.callbackURL(providerName)
	stateData := map[string]interface{}{
		"provider":      providerName,
		"redirect_uri":  redirectURI,
		"code_verifier": codeVerifier,
		"callback_url":  callbackURL,
	}
	ttl := int64(s.cfg.StateTTLMinutes) * 60
	if err := s.stateRepo.Set(ctx, state, stateData, ttl); err != nil {
		return "", fmt.Errorf("store state failed: %w", err)
	}

	// 构建授权 URL
	authURL := provider.BuildAuthURL(state, codeVerifier, callbackURL)
	return authURL, nil
}

// HandleCallback 处理 OAuth 回调
func (s *AuthService) HandleCallback(ctx context.Context, providerName, code, state string) (string, *entity.User, error) {
	// 验证并删除 state（原子操作，防重放）
	stateData, err := s.stateRepo.GetAndDelete(ctx, state)
	if err != nil {
		return "", nil, fmt.Errorf("invalid or expired state: %w", err)
	}

	// 验证 provider 一致性
	if stateData["provider"] != providerName {
		return "", nil, fmt.Errorf("provider mismatch: expected %s, got %s", stateData["provider"], providerName)
	}

	provider, err := s.factory.GetProvider(providerName)
	if err != nil {
		return "", nil, err
	}

	// 用 code 换取用户信息
	codeVerifier := stateData["code_verifier"]
	callbackURL := stateData["callback_url"]
	userInfo, err := provider.ExchangeCode(ctx, code, codeVerifier, callbackURL)
	if err != nil {
		return "", nil, fmt.Errorf("token exchange failed: %w", err)
	}

	// 查找或创建用户
	user, err := s.userRepo.FindByEmail(ctx, userInfo.Email)
	if err != nil {
		// 新用户 — 创建
		user = &entity.User{
			Email:             normalizeEmail(userInfo.Email),
			Name:              userInfo.Name,
			GivenName:         userInfo.GivenName,
			FamilyName:        userInfo.FamilyName,
			AvatarURL:         userInfo.AvatarURL,
			Locale:            userInfo.Locale,
			PreferredLanguage: userInfo.PreferredLanguage,
			EmailVerified:     userInfo.EmailVerified,
		}
		user, err = s.userRepo.Upsert(ctx, user)
		if err != nil {
			return "", nil, fmt.Errorf("create user failed: %w", err)
		}
		logsdk.Info(ctx, "[Auth] 新用户注册",
			logsdk.Any("provider", providerName),
			logsdk.Any("email", userInfo.Email),
		)

		// 注册赠送 Token
		if s.tokenSvc != nil {
			go func() {
				_ = s.tokenSvc.RegisterGrant(context.Background(), strconv.FormatUint(user.ID, 10))
			}()
		}
	} else {
		// 更新用户信息（不覆盖 email）
		if userInfo.Name != "" {
			user.Name = userInfo.Name
		}
		if userInfo.GivenName != "" {
			user.GivenName = userInfo.GivenName
		}
		if userInfo.FamilyName != "" {
			user.FamilyName = userInfo.FamilyName
		}
		if userInfo.AvatarURL != "" {
			user.AvatarURL = userInfo.AvatarURL
		}
		if userInfo.Locale != "" {
			user.Locale = userInfo.Locale
		}
		if userInfo.PreferredLanguage != "" {
			user.PreferredLanguage = userInfo.PreferredLanguage
		}
		user.EmailVerified = userInfo.EmailVerified
		user, err = s.userRepo.Upsert(ctx, user)
		if err != nil {
			return "", nil, fmt.Errorf("update user failed: %w", err)
		}
	}

	// Upsert OAuth 账号
	now := time.Now()
	oauthAcct := &entity.OAuthAccount{
		UserID:         user.ID,
		Provider:       providerName,
		ProviderUserID: userInfo.ProviderUserID,
		ExpiresAt:      &now,
	}
	if err := s.oauthRepo.Upsert(ctx, oauthAcct); err != nil {
		return "", nil, fmt.Errorf("save oauth account failed: %w", err)
	}

	// 创建 session
	sessionID, err := s.createSession(ctx, user.ID)
	if err != nil {
		return "", nil, fmt.Errorf("create session failed: %w", err)
	}

	// 更新最后登录时间
	if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		logsdk.Warn(ctx, "[Auth] update last login failed", logsdk.Err(err))
	}

	logsdk.Info(ctx, "[Auth] 登录成功",
		logsdk.Any("provider", providerName),
		logsdk.Any("user_id", user.ID),
		logsdk.Any("email", user.Email),
	)

	return sessionID, user, nil
}

// createSession 创建 Redis session
func (s *AuthService) createSession(ctx context.Context, userID uint64) (string, error) {
	sessionID := generateRandomHex(64)
	data := map[string]interface{}{
		"user_id":    fmt.Sprintf("%d", userID),
		"created_at": time.Now().Format(time.RFC3339),
	}
	ttl := int64(s.cfg.SessionTTLHours) * 3600
	if err := s.sessionRepo.Create(ctx, sessionID, data, ttl); err != nil {
		return "", err
	}
	return sessionID, nil
}

// GetSession 获取 session 数据
func (s *AuthService) GetSession(ctx context.Context, sessionID string) (map[string]string, error) {
	return s.sessionRepo.Get(ctx, sessionID)
}

// GetUser 根据 session 获取用户
func (s *AuthService) GetUser(ctx context.Context, sessionID string) (*entity.User, error) {
	session, err := s.sessionRepo.Get(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	var userID uint64
	fmt.Sscanf(session["user_id"], "%d", &userID)
	if userID == 0 {
		return nil, fmt.Errorf("invalid user_id in session")
	}
	return s.userRepo.FindByID(ctx, userID)
}

// GetUserByID 根据 ID 获取用户
func (s *AuthService) GetUserByID(ctx context.Context, userID uint64) (*entity.User, error) {
	return s.userRepo.FindByID(ctx, userID)
}

// GetLinkedProviders 获取用户绑定的所有 Provider
func (s *AuthService) GetLinkedProviders(ctx context.Context, userID uint64) ([]*entity.OAuthAccount, error) {
	return s.oauthRepo.FindByUserID(ctx, userID)
}

// Logout 登出（删除 session）
func (s *AuthService) Logout(ctx context.Context, sessionID string) error {
	return s.sessionRepo.Delete(ctx, sessionID)
}

// GetSessionCookieName 返回 session cookie 名称
func (s *AuthService) GetSessionCookieName() string {
	return s.cfg.SessionCookieName
}

// callbackURL 生成回调 URL
func (s *AuthService) callbackURL(provider string) string {
	base := s.cfg.SiteURL
	if base == "" {
		base = "https://ycjson.top"
	}
	return fmt.Sprintf("%s/auth/%s/callback", base, provider)
}

// generateRandomHex 生成指定字节数的随机 hex 字符串
func generateRandomHex(bytes int) string {
	buf := make([]byte, bytes)
	rand.Read(buf)
	return hex.EncodeToString(buf)
}

// ─── Email Login ──────────────────────────────────────────────────────────

// SendEmailCode 发送邮箱验证码
func (s *AuthService) SendEmailCode(ctx context.Context, email string) error {
	email = normalizeEmail(email)
	if email == "" {
		return fmt.Errorf("invalid email address")
	}

	if s.emailSender == nil {
		return fmt.Errorf("email service is not configured")
	}

	// 生成 6 位数字验证码
	code := generateNumericCode(6)

	// 存储到 Redis，10 分钟有效
	if err := s.emailCodeRepo.Set(ctx, email, code, 600); err != nil {
		return fmt.Errorf("store code failed: %w", err)
	}

	// 发送邮件
	if err := s.emailSender.SendVerificationCode(ctx, email, code); err != nil {
		return fmt.Errorf("send email failed: %w", err)
	}

	logsdk.Info(ctx, "[Auth] 邮箱验证码已发送", logsdk.Any("email", email))
	return nil
}

// VerifyEmailCode 验证邮箱验证码并登录/注册
func (s *AuthService) VerifyEmailCode(ctx context.Context, email, code string) (string, *entity.User, error) {
	email = normalizeEmail(email)
	if email == "" || code == "" {
		return "", nil, fmt.Errorf("invalid parameters")
	}

	// 验证码校验（原子操作：验证 + 删除）
	ok, err := s.emailCodeRepo.Verify(ctx, email, code)
	if err != nil {
		return "", nil, fmt.Errorf("verify code failed: %w", err)
	}
	if !ok {
		return "", nil, fmt.Errorf("invalid or expired verification code")
	}

	// 查找或创建用户
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		// 新用户
		user = &entity.User{
			Email: email,
			Name:  email, // 默认用 email 作为 name
		}
		user, err = s.userRepo.Upsert(ctx, user)
		if err != nil {
			return "", nil, fmt.Errorf("create user failed: %w", err)
		}
		logsdk.Info(ctx, "[Auth] 邮箱注册成功",
			logsdk.Any("email", email),
			logsdk.Any("user_id", user.ID),
		)

		// 注册赠送 Token
		if s.tokenSvc != nil {
			go func() {
				_ = s.tokenSvc.RegisterGrant(context.Background(), strconv.FormatUint(user.ID, 10))
			}()
		}
	}

	// 创建 OAuth 账号记录（provider = email）
	oauthAcct := &entity.OAuthAccount{
		UserID:         user.ID,
		Provider:       "email",
		ProviderUserID: email,
	}
	if err := s.oauthRepo.Upsert(ctx, oauthAcct); err != nil {
		logsdk.Warn(ctx, "[Auth] save email oauth account failed", logsdk.Err(err))
	}

	// 创建 session
	sessionID, err := s.createSession(ctx, user.ID)
	if err != nil {
		return "", nil, fmt.Errorf("create session failed: %w", err)
	}

	logsdk.Info(ctx, "[Auth] 邮箱登录成功",
		logsdk.Any("email", email),
		logsdk.Any("user_id", user.ID),
	)

	return sessionID, user, nil
}

// generateNumericCode 生成指定长度的数字验证码
func generateNumericCode(length int) string {
	const digits = "0123456789"
	buf := make([]byte, length)
	rand.Read(buf)
	for i := range buf {
		buf[i] = digits[int(buf[i])%len(digits)]
	}
	return string(buf)
}
