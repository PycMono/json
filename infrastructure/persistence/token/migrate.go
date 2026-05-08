package token_persistence

import (
	"context"

	logsdk "github.com/PycMono/go-logger-sdk"

	"PycMono/github/json/domain/entity"

	"gorm.io/gorm"
)

// AutoMigrate 自动创建 / 更新 Token 相关表结构
func AutoMigrate(db *gorm.DB) {
	if db == nil {
		return
	}
	if err := db.AutoMigrate(
		&entity.UserTokenBalance{},
		&entity.TokenTransaction{},
		&entity.QuotaRule{},
	); err != nil {
		logsdk.Fatal(context.TODO(), "[MySQL] Token AutoMigrate 失败", logsdk.Err(err))
	}
	logsdk.Info(context.TODO(), "[MySQL] Token 表结构同步完成（user_token_balances / token_transactions / quota_rules）")

	// 初始化默认计费规则
	if err := SeedDefaultRules(context.TODO(), db); err != nil {
		logsdk.Warn(context.TODO(), "[MySQL] 默认计费规则初始化失败", logsdk.Err(err))
	} else {
		logsdk.Info(context.TODO(), "[MySQL] 默认计费规则初始化完成")
	}
}
