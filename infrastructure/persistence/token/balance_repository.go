package token_persistence

import (
	"context"
	"errors"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type tokenBalanceRepo struct {
	db *gorm.DB
}

// NewTokenBalanceRepository 创建余额仓储
func NewTokenBalanceRepository(db *gorm.DB) repository.TokenBalanceRepository {
	return &tokenBalanceRepo{db: db}
}

func normalizeAccountType(at string) string {
	if at == "" {
		return entity.AccountTypeAI
	}
	return at
}

func (r *tokenBalanceRepo) GetOrCreate(ctx context.Context, userID, accountType string) (*entity.UserTokenBalance, error) {
	at := normalizeAccountType(accountType)
	var bal entity.UserTokenBalance
	err := r.db.WithContext(ctx).
		Where(entity.UserTokenBalance{UserID: userID, AccountType: at}).
		Attrs(entity.UserTokenBalance{Balance: 0}).
		FirstOrCreate(&bal).Error
	return &bal, err
}

func (r *tokenBalanceRepo) GetBalance(ctx context.Context, userID, accountType string) (int64, error) {
	at := normalizeAccountType(accountType)
	var bal entity.UserTokenBalance
	err := r.db.WithContext(ctx).
		Select("balance").
		Where("user_id = ? AND account_type = ?", userID, at).
		First(&bal).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, nil
	}
	return bal.Balance, err
}

func (r *tokenBalanceRepo) Consume(ctx context.Context, userID, accountType string, amount int64) (int64, error) {
	at := normalizeAccountType(accountType)
	var balanceAfter int64
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var bal entity.UserTokenBalance
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND account_type = ?", userID, at).First(&bal).Error; err != nil {
			return err
		}
		if bal.Balance < amount {
			return repository.ErrInsufficientBalance
		}
		bal.Balance -= amount
		bal.TotalConsumed += amount
		balanceAfter = bal.Balance
		return tx.Save(&bal).Error
	})
	return balanceAfter, err
}

func (r *tokenBalanceRepo) Grant(ctx context.Context, userID, accountType string, amount int64) (int64, error) {
	at := normalizeAccountType(accountType)
	var balanceAfter int64
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var bal entity.UserTokenBalance
		result := tx.Where("user_id = ? AND account_type = ?", userID, at).First(&bal)
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			bal = entity.UserTokenBalance{UserID: userID, AccountType: at}
		} else if result.Error != nil {
			return result.Error
		}
		bal.Balance += amount
		bal.TotalGranted += amount
		balanceAfter = bal.Balance
		return tx.Save(&bal).Error
	})
	return balanceAfter, err
}

func (r *tokenBalanceRepo) Refund(ctx context.Context, userID, accountType string, amount int64) (int64, error) {
	at := normalizeAccountType(accountType)
	var balanceAfter int64
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var bal entity.UserTokenBalance
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND account_type = ?", userID, at).First(&bal).Error; err != nil {
			return err
		}
		bal.Balance += amount
		bal.TotalRefunded += amount
		balanceAfter = bal.Balance
		return tx.Save(&bal).Error
	})
	return balanceAfter, err
}
