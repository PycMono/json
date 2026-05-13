package auth

import (
	"context"
	"fmt"
	"testing"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/infrastructure/config"
)

// ─── Mock Repositories ────────────────────────────────────────────────

type mockUserRepo struct {
	users map[uint64]*entity.User
}

func (m *mockUserRepo) FindByID(ctx context.Context, id uint64) (*entity.User, error) {
	if u, ok := m.users[id]; ok {
		return u, nil
	}
	return nil, fmt.Errorf("user not found")
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

func (m *mockUserRepo) Upsert(ctx context.Context, user *entity.User) (*entity.User, error) {
	if user.ID == 0 {
		user.ID = uint64(len(m.users) + 1)
	}
	m.users[user.ID] = user
	return user, nil
}

func (m *mockUserRepo) UpdateLastLogin(ctx context.Context, id uint64) error {
	return nil
}

type mockOAuthRepo struct {
	accounts map[string]*entity.OAuthAccount
}

func (m *mockOAuthRepo) FindByProviderAndUID(ctx context.Context, provider, uid string) (*entity.OAuthAccount, error) {
	key := provider + ":" + uid
	if a, ok := m.accounts[key]; ok {
		return a, nil
	}
	return nil, fmt.Errorf("not found")
}

func (m *mockOAuthRepo) FindByUserID(ctx context.Context, userID uint64) ([]*entity.OAuthAccount, error) {
	var result []*entity.OAuthAccount
	for _, a := range m.accounts {
		if a.UserID == userID {
			result = append(result, a)
		}
	}
	return result, nil
}

func (m *mockOAuthRepo) Upsert(ctx context.Context, acct *entity.OAuthAccount) error {
	key := acct.Provider + ":" + acct.ProviderUserID
	m.accounts[key] = acct
	return nil
}

type mockSessionRepo struct {
	sessions map[string]map[string]string
}

func (m *mockSessionRepo) Create(ctx context.Context, sessionID string, data map[string]interface{}, ttlSeconds int64) error {
	strData := make(map[string]string)
	for k, v := range data {
		strData[k] = fmt.Sprintf("%v", v)
	}
	m.sessions[sessionID] = strData
	return nil
}

func (m *mockSessionRepo) Get(ctx context.Context, sessionID string) (map[string]string, error) {
	if s, ok := m.sessions[sessionID]; ok {
		return s, nil
	}
	return nil, fmt.Errorf("session not found")
}

func (m *mockSessionRepo) Delete(ctx context.Context, sessionID string) error {
	delete(m.sessions, sessionID)
	return nil
}

type mockStateRepo struct {
	states map[string]map[string]string
}

func (m *mockStateRepo) Set(ctx context.Context, state string, data map[string]interface{}, ttlSeconds int64) error {
	strData := make(map[string]string)
	for k, v := range data {
		strData[k] = fmt.Sprintf("%v", v)
	}
	m.states[state] = strData
	return nil
}

func (m *mockStateRepo) GetAndDelete(ctx context.Context, state string) (map[string]string, error) {
	if s, ok := m.states[state]; ok {
		delete(m.states, state)
		return s, nil
	}
	return nil, fmt.Errorf("state not found")
}

type mockEmailCodeRepo struct {
	codes map[string]string
}

func (m *mockEmailCodeRepo) Set(ctx context.Context, email, code string, ttlSeconds int64) error {
	m.codes[email] = code
	return nil
}

func (m *mockEmailCodeRepo) Verify(ctx context.Context, email, code string) (bool, error) {
	if stored, ok := m.codes[email]; ok && stored == code {
		delete(m.codes, email)
		return true, nil
	}
	return false, nil
}

type mockEmailSender struct {
	lastTo   string
	lastCode string
}

func (m *mockEmailSender) SendVerificationCode(ctx context.Context, to, code string) error {
	m.lastTo = to
	m.lastCode = code
	return nil
}

// helper to create a new AuthService with mocks
func newTestAuthService(cfg config.OAuthConfig) *AuthService {
	userRepo := &mockUserRepo{users: make(map[uint64]*entity.User)}
	oauthRepo := &mockOAuthRepo{accounts: make(map[string]*entity.OAuthAccount)}
	sessionRepo := &mockSessionRepo{sessions: make(map[string]map[string]string)}
	stateRepo := &mockStateRepo{states: make(map[string]map[string]string)}
	emailCodeRepo := &mockEmailCodeRepo{codes: make(map[string]string)}
	emailSender := &mockEmailSender{}
	return NewAuthService(cfg, userRepo, oauthRepo, sessionRepo, stateRepo, emailCodeRepo, emailSender)
}

// ─── Tests ────────────────────────────────────────────────────────────

func TestNewAuthService(t *testing.T) {
	svc := newTestAuthService(config.OAuthConfig{
		SiteURL:           "https://example.com",
		SessionCookieName: "test_session",
		SessionTTLHours:   24,
		StateTTLMinutes:   10,
		Google: config.GoogleOAuthConfig{
			ClientID:     "test-client-id",
			ClientSecret: "test-secret",
		},
	})

	if svc == nil {
		t.Fatal("expected non-nil service")
	}

	if !svc.ProviderExists("google") {
		t.Error("expected google provider to exist")
	}

}

func TestProviderFactory(t *testing.T) {
	f := GetFactory()

	// Google should be registered from TestNewAuthService above
	if !f.ProviderExists("google") {
		t.Error("expected google in factory after NewAuthService")
	}

	providers := f.ListProviders()
	if len(providers) == 0 {
		t.Error("expected at least one provider registered")
	}

	p, err := f.GetProvider("google")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if p.Name() != "google" {
		t.Errorf("expected provider name 'google', got '%s'", p.Name())
	}

	_, err = f.GetProvider("nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent provider")
	}
}

func TestGenerateRandomHex(t *testing.T) {
	hex1 := generateRandomHex(32)
	hex2 := generateRandomHex(32)

	if len(hex1) != 64 {
		t.Errorf("expected 64 hex chars, got %d", len(hex1))
	}

	if hex1 == hex2 {
		t.Error("expected different random values")
	}
}

func TestCallbackURL(t *testing.T) {
	svc := newTestAuthService(config.OAuthConfig{
		SiteURL:         "https://example.com",
		SessionTTLHours: 24,
		StateTTLMinutes: 10,
	})

	expected := "https://example.com/auth/google/callback"
	got := svc.callbackURL("google")
	if got != expected {
		t.Errorf("expected %s, got %s", expected, got)
	}
}

func TestCallbackURL_Fallback(t *testing.T) {
	svc := newTestAuthService(config.OAuthConfig{
		SiteURL:         "", // Empty, should fallback
		SessionTTLHours: 24,
		StateTTLMinutes: 10,
	})

	expected := "https://ycjson.top/auth/google/callback"
	got := svc.callbackURL("google")
	if got != expected {
		t.Errorf("expected %s, got %s", expected, got)
	}
}

func TestInitiateLogin(t *testing.T) {
	svc := newTestAuthService(config.OAuthConfig{
		SiteURL:           "https://example.com",
		SessionCookieName: "test_session",
		SessionTTLHours:   24,
		StateTTLMinutes:   10,
		Google: config.GoogleOAuthConfig{
			ClientID:     "test-client-id",
			ClientSecret: "test-secret",
		},
	})

	authURL, err := svc.InitiateLogin(context.Background(), "google", "/auth/me")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if authURL == "" {
		t.Error("expected non-empty auth URL")
	}
}

func TestInitiateLogin_UnsupportedProvider(t *testing.T) {
	svc := newTestAuthService(config.OAuthConfig{
		SiteURL:           "https://example.com",
		SessionCookieName: "test_session",
		SessionTTLHours:   24,
		StateTTLMinutes:   10,
	})

	_, err := svc.InitiateLogin(context.Background(), "nonexistent", "/auth/me")
	if err == nil {
		t.Error("expected error for unsupported provider")
	}
}

func TestSendEmailCode_NoSender(t *testing.T) {
	svc := newTestAuthService(config.OAuthConfig{})
	svc.emailSender = nil

	err := svc.SendEmailCode(context.Background(), "test@example.com")
	if err == nil {
		t.Error("expected error when email sender is not configured")
	}
}

func TestVerifyEmailCode_Invalid(t *testing.T) {
	svc := newTestAuthService(config.OAuthConfig{})

	_, _, err := svc.VerifyEmailCode(context.Background(), "test@example.com", "123456")
	if err == nil {
		t.Error("expected error for invalid verification code")
	}
}

func TestGenerateNumericCode(t *testing.T) {
	code1 := generateNumericCode(6)
	code2 := generateNumericCode(6)

	if len(code1) != 6 {
		t.Errorf("expected 6 digit code, got %d", len(code1))
	}

	for _, c := range code1 {
		if c < '0' || c > '9' {
			t.Errorf("expected digit, got %c", c)
		}
	}

	if code1 == code2 {
		t.Log("warning: two random codes are equal (extremely unlikely)")
	}
}
