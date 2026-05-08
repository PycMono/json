package token

import (
	"context"
	"encoding/json"
	"fmt"

	logsdk "github.com/PycMono/go-logger-sdk"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"
)

const DefaultGrantAmount int64 = 2000

// TokenService Token 管理服务
// 升级为 Quota-as-a-Service：支持规则驱动消费、退款、动态统计
type TokenService struct {
	balRepo  repository.TokenBalanceRepository
	txRepo   repository.TokenTransactionRepository
	ruleRepo repository.QuotaRuleRepository
}

// NewTokenService 创建 Token 服务
func NewTokenService(b repository.TokenBalanceRepository, t repository.TokenTransactionRepository, r repository.QuotaRuleRepository) *TokenService {
	return &TokenService{balRepo: b, txRepo: t, ruleRepo: r}
}

// CreateAccounts 为用户创建默认额度账户（注册时调用）
func (s *TokenService) CreateAccounts(ctx context.Context, userID string) error {
	_, err := s.balRepo.GetOrCreate(ctx, userID, entity.AccountTypeAI)
	return err
}

// RegisterGrant 新用户注册时赠送 2000 Token
func (s *TokenService) RegisterGrant(ctx context.Context, userID string) error {
	balAfter, err := s.balRepo.Grant(ctx, userID, entity.AccountTypeAI, DefaultGrantAmount)
	if err != nil {
		return fmt.Errorf("grant failed: %w", err)
	}
	if err := s.txRepo.Insert(ctx, &entity.TokenTransaction{
		UserID:       userID,
		AccountType:  entity.AccountTypeAI,
		TxType:       "grant",
		Amount:       DefaultGrantAmount,
		BalanceAfter: balAfter,
		Note:         "新用户注册赠送",
	}); err != nil {
		logsdk.Warn(ctx, "[Token] register grant tx insert failed", logsdk.Err(err))
	}
	logsdk.Info(ctx, "[Token] register grant", logsdk.Any("user_id", userID), logsdk.Any("amount", DefaultGrantAmount))
	return nil
}

// UsageInput 消费输入参数
type UsageInput struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	ModelName        string
	Extra            map[string]interface{}
}

// Consume 规则驱动消费
// 根据 ruleCode 查询计费规则，计算应扣金额，执行扣费并记录流水
func (s *TokenService) Consume(ctx context.Context, userID string, ruleCode string, usage UsageInput) (*entity.ConsumeResult, error) {
	rule, err := s.ruleRepo.GetByCode(ctx, ruleCode)
	if err != nil {
		return nil, fmt.Errorf("get rule failed: %w", err)
	}
	if rule == nil {
		return nil, fmt.Errorf("rule not found: %s", ruleCode)
	}

	// 计算费用
	amount := s.calculateCost(rule, usage)
	if amount <= 0 {
		amount = 1 // 最低扣 1
	}

	balAfter, err := s.balRepo.Consume(ctx, userID, rule.AccountType, amount)
	if err != nil {
		return nil, fmt.Errorf("consume failed: %w", err)
	}

	// 构建 metadata
	var metaBytes []byte
	if len(usage.Extra) > 0 {
		metaBytes, _ = json.Marshal(usage.Extra)
	}

	toolName := ruleCode
	if idx := len("ai."); len(ruleCode) > idx && ruleCode[:idx] == "ai." {
		toolName = ruleCode[idx:]
	}

	if err := s.txRepo.Insert(ctx, &entity.TokenTransaction{
		UserID:           userID,
		AccountType:      rule.AccountType,
		TxType:           "consume",
		Amount:           amount,
		ToolName:         toolName,
		ModelName:        usage.ModelName,
		PromptTokens:     usage.PromptTokens,
		CompletionTokens: usage.CompletionTokens,
		TotalTokens:      usage.TotalTokens,
		BalanceAfter:     balAfter,
		Metadata:         string(metaBytes),
	}); err != nil {
		logsdk.Warn(ctx, "[Token] consume tx insert failed", logsdk.Err(err))
	}

	return &entity.ConsumeResult{ActualCost: amount, BalanceAfter: balAfter}, nil
}

// calculateCost 根据规则计算费用
func (s *TokenService) calculateCost(rule *entity.QuotaRule, usage UsageInput) int64 {
	var amount int64
	switch rule.PricingType {
	case "per_call":
		amount = rule.Rate
	case "per_char":
		// 字符数消费需要调用方传入字符数到 Extra 中
		amount = rule.Rate * int64(usage.TotalTokens) // fallback
	case "per_token":
		fallthrough
	default:
		amount = rule.Rate * int64(usage.TotalTokens)
	}

	if rule.MinCost > 0 && amount < rule.MinCost {
		amount = rule.MinCost
	}
	if rule.MaxCost > 0 && amount > rule.MaxCost {
		amount = rule.MaxCost
	}
	return amount
}

// ConsumeForAI AI 调用完成后扣减 Token（向后兼容）
func (s *TokenService) ConsumeForAI(ctx context.Context, userID, toolName, modelName string, promptTokens, completionTokens, totalTokens int) error {
	ruleCode := "ai." + toolName
	_, err := s.Consume(ctx, userID, ruleCode, UsageInput{
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		TotalTokens:      totalTokens,
		ModelName:        modelName,
	})
	return err
}

// CheckBalance 前置余额检查（AI 请求前调用）
func (s *TokenService) CheckBalance(ctx context.Context, userID string, minRequired int64) error {
	bal, err := s.balRepo.GetBalance(ctx, userID, entity.AccountTypeAI)
	if err != nil {
		return err
	}
	if bal < minRequired {
		return repository.ErrInsufficientBalance
	}
	return nil
}

// AdminGrant 管理员手动发放 Token
func (s *TokenService) AdminGrant(ctx context.Context, userID string, amount int64, note string) error {
	balAfter, err := s.balRepo.Grant(ctx, userID, entity.AccountTypeAI, amount)
	if err != nil {
		return err
	}
	return s.txRepo.Insert(ctx, &entity.TokenTransaction{
		UserID:       userID,
		AccountType:  entity.AccountTypeAI,
		TxType:       "grant",
		Amount:       amount,
		BalanceAfter: balAfter,
		Note:         note,
	})
}

// Refund 退款
func (s *TokenService) Refund(ctx context.Context, userID string, originalTxID uint, amount int64, reason string) error {
	balAfter, err := s.balRepo.Refund(ctx, userID, entity.AccountTypeAI, amount)
	if err != nil {
		return fmt.Errorf("refund failed: %w", err)
	}

	meta := map[string]interface{}{"original_tx_id": originalTxID, "reason": reason}
	metaBytes, _ := json.Marshal(meta)

	return s.txRepo.Insert(ctx, &entity.TokenTransaction{
		UserID:       userID,
		AccountType:  entity.AccountTypeAI,
		TxType:       "refund",
		Amount:       amount,
		BalanceAfter: balAfter,
		Metadata:     string(metaBytes),
		Note:         reason,
	})
}

// GetBalanceVO 组装余额 VO
func (s *TokenService) GetBalanceVO(ctx context.Context, userID string) (*entity.TokenBalanceVO, error) {
	bal, err := s.balRepo.GetOrCreate(ctx, userID, entity.AccountTypeAI)
	if err != nil {
		return nil, err
	}
	var pct float64
	if bal.TotalGranted > 0 {
		pct = float64(bal.TotalConsumed) / float64(bal.TotalGranted)
		if pct > 1 {
			pct = 1
		}
	}
	return &entity.TokenBalanceVO{
		Balance:       bal.Balance,
		TotalGranted:  bal.TotalGranted,
		TotalConsumed: bal.TotalConsumed,
		TotalRefunded: bal.TotalRefunded,
		UsedPercent:   pct,
	}, nil
}

// TxRepo 暴露 txRepo 供 controller 调用
func (s *TokenService) TxRepo() repository.TokenTransactionRepository {
	return s.txRepo
}

// RuleRepo 暴露 ruleRepo 供 controller 调用
func (s *TokenService) RuleRepo() repository.QuotaRuleRepository {
	return s.ruleRepo
}
