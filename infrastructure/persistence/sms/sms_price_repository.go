package sms_persistence

import (
	"context"
	"strings"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SmsPriceRepository struct{ db *gorm.DB }

func NewSmsPriceRepository(db *gorm.DB) repository.ISmsPriceRepository {
	return &SmsPriceRepository{db: db}
}

func (r *SmsPriceRepository) Count(ctx context.Context) (int64, error) {
	var cnt int64
	err := r.db.WithContext(ctx).Model(&entity.SmsPrice{}).Count(&cnt).Error
	return cnt, err
}

func (r *SmsPriceRepository) FindByCountry(ctx context.Context, country string) ([]*entity.SmsPrice, error) {
	var rows []*entity.SmsPrice
	q := r.db.WithContext(ctx)
	if country != "" && !strings.EqualFold(country, "any") {
		q = q.Where("country = ?", country)
	}
	if err := q.Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *SmsPriceRepository) FindAll(ctx context.Context) ([]*entity.SmsPrice, error) {
	var rows []*entity.SmsPrice
	if err := r.db.WithContext(ctx).Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *SmsPriceRepository) FindByCountryAndProduct(ctx context.Context, country, product string) ([]*entity.SmsPrice, error) {
	var rows []*entity.SmsPrice
	if err := r.db.WithContext(ctx).Where("country = ? AND product = ?", country, product).Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *SmsPriceRepository) Upsert(ctx context.Context, e *entity.SmsPrice) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "country"}, {Name: "product"}, {Name: "operator"}},
			DoUpdates: clause.AssignmentColumns([]string{"cost", "count", "rate", "synced_at", "updated_at"}),
		}).Create(e).Error
}

func (r *SmsPriceRepository) BatchUpsert(ctx context.Context, prices []*entity.SmsPrice) error {
	if len(prices) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "country"}, {Name: "product"}, {Name: "operator"}},
			DoUpdates: clause.AssignmentColumns([]string{"cost", "count", "rate", "synced_at", "updated_at"}),
		}).CreateInBatches(prices, 500).Error
}
