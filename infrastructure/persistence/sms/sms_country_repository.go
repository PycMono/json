package sms_persistence

import (
	"context"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SmsCountryRepository struct{ db *gorm.DB }

func NewSmsCountryRepository(db *gorm.DB) repository.ISmsCountryRepository {
	return &SmsCountryRepository{db: db}
}

func (r *SmsCountryRepository) Count(ctx context.Context) (int64, error) {
	var cnt int64
	err := r.db.WithContext(ctx).Model(&entity.SmsCountry{}).Count(&cnt).Error
	return cnt, err
}

func (r *SmsCountryRepository) FindAll(ctx context.Context) ([]*entity.SmsCountry, error) {
	var rows []*entity.SmsCountry
	if err := r.db.WithContext(ctx).Order("name ASC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *SmsCountryRepository) FindByName(ctx context.Context, name string) (*entity.SmsCountry, error) {
	var row entity.SmsCountry
	if err := r.db.WithContext(ctx).Where("name = ?", name).First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *SmsCountryRepository) Upsert(ctx context.Context, e *entity.SmsCountry) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "iso2", "flag", "updated_at"}),
		}).Create(e).Error
}

func (r *SmsCountryRepository) BatchUpsert(ctx context.Context, countries []*entity.SmsCountry) error {
	if len(countries) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "iso2", "flag", "updated_at"}),
		}).CreateInBatches(countries, 200).Error
}
