package persistence

import (
	"context"
	"time"

	"PycMono/github/json/domain/entity"
	logsdk "github.com/PycMono/go-logger-sdk"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ── UserRepository ────────────────────────────────────────────────

type UserRepository struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(ctx context.Context, id uint64) (*entity.User, error) {
	var user entity.User
	if err := r.db.WithContext(ctx).First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	var user entity.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Upsert(ctx context.Context, user *entity.User) (*entity.User, error) {
	result := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "email"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "given_name", "family_name", "avatar_url", "locale", "preferred_language", "email_verified", "last_login_at", "login_count", "updated_at"}),
	}).Create(user)

	if result.Error != nil {
		return nil, result.Error
	}

	// 如果是冲突更新（RowsAffected == 0），需要重新查询获取完整数据
	if result.RowsAffected == 0 {
		var existing entity.User
		if err := r.db.WithContext(ctx).Where("email = ?", user.Email).First(&existing).Error; err != nil {
			return nil, err
		}
		return &existing, nil
	}
	return user, nil
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uint64) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&entity.User{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"last_login_at": now,
			"login_count":   gorm.Expr("login_count + 1"),
			"updated_at":    now,
		}).Error
}

// ── OAuthAccountRepository ───────────────────────────────────────

type OAuthAccountRepository struct{ db *gorm.DB }

func NewOAuthAccountRepository(db *gorm.DB) *OAuthAccountRepository {
	return &OAuthAccountRepository{db: db}
}

func (r *OAuthAccountRepository) FindByProviderAndUID(ctx context.Context, provider, providerUID string) (*entity.OAuthAccount, error) {
	var acct entity.OAuthAccount
	if err := r.db.WithContext(ctx).
		Where("provider = ? AND provider_user_id = ?", provider, providerUID).
		First(&acct).Error; err != nil {
		return nil, err
	}
	return &acct, nil
}

func (r *OAuthAccountRepository) FindByUserID(ctx context.Context, userID uint64) ([]*entity.OAuthAccount, error) {
	var accounts []*entity.OAuthAccount
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at ASC").
		Find(&accounts).Error
	return accounts, err
}

func (r *OAuthAccountRepository) Upsert(ctx context.Context, acct *entity.OAuthAccount) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "provider"}, {Name: "provider_user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"access_token", "refresh_token", "expires_at", "updated_at"}),
	}).Create(acct).Error
}

// ── AutoMigrate ───────────────────────────────────────────────────

func AutoMigrateAuth(db *gorm.DB) {
	if db == nil {
		return
	}
	if err := db.AutoMigrate(
		&entity.User{},
		&entity.OAuthAccount{},
	); err != nil {
		logsdk.Error(context.TODO(), "[MySQL] Auth AutoMigrate 失败", logsdk.Err(err))
		return
	}
	logsdk.Info(context.TODO(), "[MySQL] Auth 表结构同步完成（users / oauth_accounts）")
}
