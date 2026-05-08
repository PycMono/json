package entity

import "time"

// User 用户实体
type User struct {
	ID                uint64     `json:"id"                  gorm:"primaryKey;autoIncrement"`
	Email             string     `json:"email"               gorm:"column:email;uniqueIndex;size:255;not null"`
	Name              string     `json:"name"                gorm:"column:name;size:255;not null;default:''"`
	GivenName         string     `json:"given_name"          gorm:"column:given_name;size:128;not null;default:''"`
	FamilyName        string     `json:"family_name"         gorm:"column:family_name;size:128;not null;default:''"`
	AvatarURL         string     `json:"avatar_url"          gorm:"column:avatar_url;size:512;not null;default:''"`
	Locale            string     `json:"locale"              gorm:"column:locale;size:10;not null;default:'en'"`
	PreferredLanguage string     `json:"preferred_language"  gorm:"column:preferred_language;size:10;not null;default:''"`
	EmailVerified     bool       `json:"email_verified"      gorm:"column:email_verified;not null;default:false"`
	LastLoginAt       *time.Time `json:"last_login_at"       gorm:"column:last_login_at"`
	LoginCount        int        `json:"login_count"         gorm:"column:login_count;not null;default:0"`
	CreatedAt         time.Time  `json:"created_at"          gorm:"column:created_at;autoCreateTime"`
	UpdatedAt         time.Time  `json:"updated_at"          gorm:"column:updated_at;autoUpdateTime"`
}

func (User) TableName() string { return "users" }