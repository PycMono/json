package repository

import (
	"context"

	"PycMono/github/json/domain/entity"
)

// ISmsCountryRepository 国家数据仓储接口
type ISmsCountryRepository interface {
	// Count 返回数据库中的国家数量（0 表示未初始化）
	Count(ctx context.Context) (int64, error)
	// FindAll 返回所有国家列表
	FindAll(ctx context.Context) ([]*entity.SmsCountry, error)
	// FindByName 按 5SIM key 查找
	FindByName(ctx context.Context, name string) (*entity.SmsCountry, error)
	// Upsert 按 name 做 INSERT … ON DUPLICATE KEY UPDATE
	Upsert(ctx context.Context, country *entity.SmsCountry) error
	// BatchUpsert 批量 upsert
	BatchUpsert(ctx context.Context, countries []*entity.SmsCountry) error
}

// ISmsProductRepository 产品/服务仓储接口
type ISmsProductRepository interface {
	Count(ctx context.Context) (int64, error)
	FindAll(ctx context.Context) ([]*entity.SmsProduct, error)
	FindByName(ctx context.Context, name string) (*entity.SmsProduct, error)
	Upsert(ctx context.Context, product *entity.SmsProduct) error
	BatchUpsert(ctx context.Context, products []*entity.SmsProduct) error
}

// ISmsPriceRepository 价格仓储接口
type ISmsPriceRepository interface {
	Count(ctx context.Context) (int64, error)
	// FindByCountry 按国家查询所有价格（支持 "any"）
	FindByCountry(ctx context.Context, country string) ([]*entity.SmsPrice, error)
	// FindAll 全量价格（分页可选）
	FindAll(ctx context.Context) ([]*entity.SmsPrice, error)
	// FindByCountryAndProduct 按国家+产品查询
	FindByCountryAndProduct(ctx context.Context, country, product string) ([]*entity.SmsPrice, error)
	// Upsert 按 country+product+operator 做 INSERT … ON DUPLICATE KEY UPDATE
	Upsert(ctx context.Context, price *entity.SmsPrice) error
	// BatchUpsert 批量 upsert
	BatchUpsert(ctx context.Context, prices []*entity.SmsPrice) error
}
