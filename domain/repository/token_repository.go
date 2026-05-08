package repository

import (
	"context"
	"errors"

	"PycMono/github/json/domain/entity"
)

// ErrInsufficientBalance 余额不足哨兵错误
var ErrInsufficientBalance = errors.New("insufficient token balance")

// TokenBalanceRepository 余额仓储接口
// 预留 accountType 参数用于未来多账户扩展，当前可传空字符串（默认 ai_token）
type TokenBalanceRepository interface {
	// GetOrCreate 查询余额，若不存在则创建
	GetOrCreate(ctx context.Context, userID, accountType string) (*entity.UserTokenBalance, error)

	// GetBalance 仅查询余额
	GetBalance(ctx context.Context, userID, accountType string) (int64, error)

	// Consume 原子扣减（事务内执行，余额不足返回 ErrInsufficientBalance）
	Consume(ctx context.Context, userID, accountType string, amount int64) (balanceAfter int64, err error)

	// Grant 发放（注册赠送 / 管理员手动发放）
	Grant(ctx context.Context, userID, accountType string, amount int64) (balanceAfter int64, err error)

	// Refund 退款（增加余额，减少累计消耗）
	Refund(ctx context.Context, userID, accountType string, amount int64) (balanceAfter int64, err error)
}

// TokenTransactionRepository 流水仓储接口
type TokenTransactionRepository interface {
	// Insert 插入一条流水
	Insert(ctx context.Context, tx *entity.TokenTransaction) error

	// ListByUser 按用户分页查询（降序）
	ListByUser(ctx context.Context, userID, accountType string, page, size int) ([]*entity.TokenTransaction, int64, error)

	// DailyStats 近 N 天每日消耗统计（动态 Breakdown）
	DailyStats(ctx context.Context, userID, accountType string, days int) ([]*entity.TokenUsageStats, error)

	// ToolBreakdown 按工具分类汇总
	ToolBreakdown(ctx context.Context, userID, accountType string, days int) (map[string]int64, error)
}

// QuotaRuleRepository 计费规则仓储接口
type QuotaRuleRepository interface {
	// GetByCode 根据规则编码查询
	GetByCode(ctx context.Context, code string) (*entity.QuotaRule, error)

	// ListEnabled 查询所有启用的规则
	ListEnabled(ctx context.Context) ([]*entity.QuotaRule, error)

	// Upsert 创建或更新规则
	Upsert(ctx context.Context, rule *entity.QuotaRule) error
}
