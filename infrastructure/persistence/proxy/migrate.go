package proxy_persistence

import (
	"PycMono/github/json/domain/entity"

	"gorm.io/gorm"
)

// AutoMigrate 自动建表（字段变更时同步）
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&entity.Proxy{})
}
