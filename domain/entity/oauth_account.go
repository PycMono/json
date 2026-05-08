package entity

import "time"

// OAuthAccount 第三方 OAuth 关联实体
type OAuthAccount struct {
	ID             uint64     `json:"id"               gorm:"primaryKey;autoIncrement"`
	UserID         uint64     `json:"user_id"          gorm:"column:user_id;not null;index"`
	Provider       string     `json:"provider"         gorm:"column:provider;size:32;not null;uniqueIndex:uk_provider_uid"`
	ProviderUserID string     `json:"provider_user_id" gorm:"column:provider_user_id;size:255;not null;uniqueIndex:uk_provider_uid"`
	AccessToken    string     `json:"access_token"     gorm:"column:access_token;size:2048"`
	RefreshToken   string     `json:"refresh_token"    gorm:"column:refresh_token;size:2048"`
	ExpiresAt      *time.Time `json:"expires_at"       gorm:"column:expires_at"`
	CreatedAt      time.Time  `json:"created_at"       gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time  `json:"updated_at"       gorm:"column:updated_at;autoUpdateTime"`
}

func (OAuthAccount) TableName() string { return "oauth_accounts" }
