package sms_persistence

import (
	"context"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SmsProductRepository struct{ db *gorm.DB }

func NewSmsProductRepository(db *gorm.DB) repository.ISmsProductRepository {
	return &SmsProductRepository{db: db}
}

func (r *SmsProductRepository) Count(ctx context.Context) (int64, error) {
	var cnt int64
	err := r.db.WithContext(ctx).Model(&entity.SmsProduct{}).Count(&cnt).Error
	return cnt, err
}

func (r *SmsProductRepository) FindAll(ctx context.Context) ([]*entity.SmsProduct, error) {
	var rows []*entity.SmsProduct
	if err := r.db.WithContext(ctx).Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *SmsProductRepository) FindByName(ctx context.Context, name string) (*entity.SmsProduct, error) {
	var row entity.SmsProduct
	if err := r.db.WithContext(ctx).Where("name = ?", name).First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *SmsProductRepository) Upsert(ctx context.Context, e *entity.SmsProduct) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "category", "icon", "updated_at"}),
		}).Create(e).Error
}

func (r *SmsProductRepository) BatchUpsert(ctx context.Context, products []*entity.SmsProduct) error {
	if len(products) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "category", "icon", "updated_at"}),
		}).CreateInBatches(products, 200).Error
}
