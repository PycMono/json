package entity

import "time"

// AccountTypeAI 默认 AI Token 账户类型
const AccountTypeAI = "ai_token"

// UserTokenBalance 用户 Token 余额主表
// 预留 account_type 字段用于未来多账户扩展，当前默认 ai_token
type UserTokenBalance struct {
	ID            uint      `gorm:"primaryKey;autoIncrement"`
	UserID        string    `gorm:"uniqueIndex:idx_user_account_type,priority:1;size:64;not null"`
	AccountType   string    `gorm:"uniqueIndex:idx_user_account_type,priority:2;size:32;not null;default:'ai_token'"`
	TotalGranted  int64     `gorm:"not null;default:0"`
	TotalConsumed int64     `gorm:"not null;default:0"`
	TotalRefunded int64     `gorm:"not null;default:0"`
	Balance       int64     `gorm:"not null;default:0;index"`
	CreatedAt     time.Time `gorm:"not null;autoCreateTime"`
	UpdatedAt     time.Time `gorm:"not null;autoUpdateTime"`
}

func (UserTokenBalance) TableName() string { return "user_token_balances" }

// TokenTransaction Token 流水明细
type TokenTransaction struct {
	ID               uint      `gorm:"primaryKey;autoIncrement"`
	UserID           string    `gorm:"index:idx_user_account_created,priority:1;size:64;not null"`
	AccountType      string    `gorm:"index:idx_user_account_created,priority:2;size:32;not null;default:'ai_token'"`
	TxType           string    `gorm:"type:enum('grant','consume','refund','bonus');not null;index"`
	Amount           int64     `gorm:"not null"`
	ToolName         string    `gorm:"size:64;default:'';index"`
	ModelName        string    `gorm:"size:128;default:''"`
	PromptTokens     int       `gorm:"not null;default:0"`
	CompletionTokens int       `gorm:"not null;default:0"`
	TotalTokens      int       `gorm:"not null;default:0"`
	BalanceAfter     int64     `gorm:"not null"`
	Metadata         string    `gorm:"type:json;default:null"` // 扩展字段 JSON
	Note             string    `gorm:"size:255;default:''"`
	CreatedAt        time.Time `gorm:"index:idx_user_account_created,priority:3;not null;autoCreateTime"`
}

func (TokenTransaction) TableName() string { return "token_transactions" }

// QuotaRule 计费规则表
type QuotaRule struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"`
	Code        string    `gorm:"uniqueIndex;size:64;not null"` // 如 ai.humanizer
	Name        string    `gorm:"size:128;not null"`
	AccountType string    `gorm:"size:32;not null;default:'ai_token'"`
	PricingType string    `gorm:"size:32;not null;default:'per_token'"` // per_token | per_call | per_char
	Rate        int64     `gorm:"not null;default:1"`                   // 每单位扣多少 token
	MinCost     int64     `gorm:"not null;default:0"`                   // 最低扣费
	MaxCost     int64     `gorm:"not null;default:0"`                   // 最高扣费（0=无上限）
	Enabled     bool      `gorm:"not null;default:true"`
	CreatedAt   time.Time `gorm:"not null;autoCreateTime"`
	UpdatedAt   time.Time `gorm:"not null;autoUpdateTime"`
}

func (QuotaRule) TableName() string { return "quota_rules" }

// TokenUsageStats 每日统计（查询用，非持久化）
type TokenUsageStats struct {
	Date        string           `json:"date"`
	TotalTokens int64            `json:"total_tokens"`
	Breakdown   map[string]int64 `json:"breakdown"` // tool_name -> tokens
}

// TokenBalanceVO API 响应用
type TokenBalanceVO struct {
	Balance       int64   `json:"balance"`
	TotalGranted  int64   `json:"total_granted"`
	TotalConsumed int64   `json:"total_consumed"`
	TotalRefunded int64   `json:"total_refunded"`
	UsedPercent   float64 `json:"used_percent"`
}

// ConsumeResult 消费结果
type ConsumeResult struct {
	ActualCost   int64 `json:"actual_cost"`
	BalanceAfter int64 `json:"balance_after"`
}
