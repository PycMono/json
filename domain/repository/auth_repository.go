package repository

import (
	"context"

	"PycMono/github/json/domain/entity"
)

// IUserRepository 用户仓储接口
type IUserRepository interface {
	FindByID(ctx context.Context, id uint64) (*entity.User, error)
	FindByEmail(ctx context.Context, email string) (*entity.User, error)
	Upsert(ctx context.Context, user *entity.User) (*entity.User, error)
	UpdateLastLogin(ctx context.Context, id uint64) error
}

// IOAuthAccountRepository OAuth 账号仓储接口
type IOAuthAccountRepository interface {
	FindByProviderAndUID(ctx context.Context, provider, providerUID string) (*entity.OAuthAccount, error)
	FindByUserID(ctx context.Context, userID uint64) ([]*entity.OAuthAccount, error)
	Upsert(ctx context.Context, acct *entity.OAuthAccount) error
}

// ISessionRepository Session 仓储接口（Redis）
type ISessionRepository interface {
	Create(ctx context.Context, sessionID string, data map[string]interface{}, ttlSeconds int64) error
	Get(ctx context.Context, sessionID string) (map[string]string, error)
	Delete(ctx context.Context, sessionID string) error
}

// IOAuthStateRepository OAuth state 仓储接口（Redis）
type IOAuthStateRepository interface {
	Set(ctx context.Context, state string, data map[string]interface{}, ttlSeconds int64) error
	GetAndDelete(ctx context.Context, state string) (map[string]string, error)
}

// IEmailCodeRepository 邮箱验证码仓储接口（Redis）
type IEmailCodeRepository interface {
	// Set 存储验证码，ttlSeconds 为有效期
	Set(ctx context.Context, email, code string, ttlSeconds int64) error
	// Verify 验证码是否正确，验证成功后删除（原子操作）
	Verify(ctx context.Context, email, code string) (bool, error)
}

// IEmailSender 邮件发送接口
type IEmailSender interface {
	SendVerificationCode(ctx context.Context, to, code string) error
}
