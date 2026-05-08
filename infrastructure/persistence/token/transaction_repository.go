package token_persistence

import (
	"context"
	"time"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"

	"gorm.io/gorm"
)

type tokenTransactionRepo struct {
	db *gorm.DB
}

// NewTokenTransactionRepository 创建流水仓储
func NewTokenTransactionRepository(db *gorm.DB) repository.TokenTransactionRepository {
	return &tokenTransactionRepo{db: db}
}

func (r *tokenTransactionRepo) Insert(ctx context.Context, tx *entity.TokenTransaction) error {
	if tx.AccountType == "" {
		tx.AccountType = entity.AccountTypeAI
	}
	return r.db.WithContext(ctx).Create(tx).Error
}

func (r *tokenTransactionRepo) ListByUser(ctx context.Context, userID, accountType string, page, size int) ([]*entity.TokenTransaction, int64, error) {
	at := normalizeAccountType(accountType)
	var list []*entity.TokenTransaction
	var total int64

	db := r.db.WithContext(ctx).Model(&entity.TokenTransaction{}).
		Where("user_id = ? AND account_type = ?", userID, at)
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * size
	if err := db.Order("created_at DESC").Offset(offset).Limit(size).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// DailyStats 动态聚合：返回每天的 total + 各工具 breakdown
func (r *tokenTransactionRepo) DailyStats(ctx context.Context, userID, accountType string, days int) ([]*entity.TokenUsageStats, error) {
	at := normalizeAccountType(accountType)
	startDate := time.Now().AddDate(0, 0, -days).Format("2006-01-02")

	type row struct {
		Date     string `gorm:"column:date"`
		ToolName string `gorm:"column:tool_name"`
		Total    int64  `gorm:"column:total"`
	}
	var rows []row

	err := r.db.WithContext(ctx).
		Model(&entity.TokenTransaction{}).
		Select("DATE(created_at) as date, tool_name, SUM(total_tokens) as total").
		Where("user_id = ? AND account_type = ? AND tx_type = ? AND created_at >= ?", userID, at, "consume", startDate).
		Group("DATE(created_at), tool_name").
		Order("date ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	// 聚合为按日统计
	dateMap := make(map[string]*entity.TokenUsageStats)
	for _, r := range rows {
		stat, ok := dateMap[r.Date]
		if !ok {
			stat = &entity.TokenUsageStats{
				Date:      r.Date,
				Breakdown: make(map[string]int64),
			}
			dateMap[r.Date] = stat
		}
		stat.TotalTokens += r.Total
		tool := r.ToolName
		if tool == "" {
			tool = "other"
		}
		stat.Breakdown[tool] += r.Total
	}

	// 按日期排序输出
	var dates []string
	for d := range dateMap {
		dates = append(dates, d)
	}
	// 已经是 ASC 因为查询 ORDER BY date ASC
	stats := make([]*entity.TokenUsageStats, 0, len(dateMap))
	for _, d := range dates {
		stats = append(stats, dateMap[d])
	}
	return stats, nil
}

func (r *tokenTransactionRepo) ToolBreakdown(ctx context.Context, userID, accountType string, days int) (map[string]int64, error) {
	at := normalizeAccountType(accountType)
	startDate := time.Now().AddDate(0, 0, -days).Format("2006-01-02")

	type result struct {
		ToolName string
		Total    int64
	}
	var results []result

	err := r.db.WithContext(ctx).
		Model(&entity.TokenTransaction{}).
		Select("tool_name, SUM(total_tokens) as total").
		Where("user_id = ? AND account_type = ? AND tx_type = ? AND created_at >= ?", userID, at, "consume", startDate).
		Group("tool_name").
		Find(&results).Error
	if err != nil {
		return nil, err
	}

	breakdown := make(map[string]int64)
	for _, r := range results {
		if r.ToolName == "" {
			r.ToolName = "other"
		}
		breakdown[r.ToolName] = r.Total
	}
	return breakdown, nil
}
