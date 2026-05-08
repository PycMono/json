package sms_persistence

import (
	"context"

	logsdk "github.com/PycMono/go-logger-sdk"

	"PycMono/github/json/domain/entity"

	"gorm.io/gorm"
)

// AutoMigrate 自动创建 / 更新 SMS 相关表结构
func AutoMigrate(db *gorm.DB) {
	if db == nil {
		return
	}
	if err := db.AutoMigrate(
		&entity.SmsCountry{},
		&entity.SmsProduct{},
		&entity.SmsPrice{},
	); err != nil {
		logsdk.Error(context.TODO(), "[MySQL] AutoMigrate 失败", logsdk.Err(err))
		return
	}
	logsdk.Info(context.TODO(), "[MySQL] SMS 表结构同步完成（sms_country / sms_product / sms_price）")
}
