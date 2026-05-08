package ai_image

import (
	"PycMono/github/json/domain/entity"
	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&entity.AIImageTask{}, &entity.AIImageModel{})
}
