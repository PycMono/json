package token_persistence

import (
	"context"
	"errors"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"

	"gorm.io/gorm"
)

type quotaRuleRepo struct {
	db *gorm.DB
}

// NewQuotaRuleRepository 创建计费规则仓储
func NewQuotaRuleRepository(db *gorm.DB) repository.QuotaRuleRepository {
	return &quotaRuleRepo{db: db}
}

func (r *quotaRuleRepo) GetByCode(ctx context.Context, code string) (*entity.QuotaRule, error) {
	var rule entity.QuotaRule
	if err := r.db.WithContext(ctx).Where("code = ? AND enabled = ?", code, true).First(&rule).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &rule, nil
}

func (r *quotaRuleRepo) ListEnabled(ctx context.Context) ([]*entity.QuotaRule, error) {
	var rules []*entity.QuotaRule
	if err := r.db.WithContext(ctx).Where("enabled = ?", true).Find(&rules).Error; err != nil {
		return nil, err
	}
	return rules, nil
}

func (r *quotaRuleRepo) Upsert(ctx context.Context, rule *entity.QuotaRule) error {
	return r.db.WithContext(ctx).
		Where(entity.QuotaRule{Code: rule.Code}).
		Assign(rule).
		FirstOrCreate(&entity.QuotaRule{}).Error
}

// SeedDefaultRules 初始化默认规则（在系统启动时调用）
func SeedDefaultRules(ctx context.Context, db *gorm.DB) error {
	repo := NewQuotaRuleRepository(db)
	defaults := []*entity.QuotaRule{
		{Code: "ai.humanizer", Name: "AI Humanizer", AccountType: entity.AccountTypeAI, PricingType: "per_token", Rate: 1, MinCost: 0, MaxCost: 0, Enabled: true},
		{Code: "ai.detector", Name: "AI Detector", AccountType: entity.AccountTypeAI, PricingType: "per_token", Rate: 1, MinCost: 0, MaxCost: 0, Enabled: true},
		{Code: "ai.compete", Name: "AI Compete", AccountType: entity.AccountTypeAI, PricingType: "per_token", Rate: 1, MinCost: 0, MaxCost: 0, Enabled: true},
		{Code: "ai.image", Name: "AI Image", AccountType: entity.AccountTypeAI, PricingType: "per_token", Rate: 1, MinCost: 0, MaxCost: 0, Enabled: true},
	}
	for _, rule := range defaults {
		if err := repo.Upsert(ctx, rule); err != nil {
			return err
		}
	}
	return nil
}
