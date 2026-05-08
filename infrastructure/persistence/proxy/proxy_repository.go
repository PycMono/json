package proxy_persistence

import (
	"time"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type proxyRepository struct {
	db *gorm.DB
}

// NewProxyRepository 创建代理仓储实例
func NewProxyRepository(db *gorm.DB) repository.ProxyRepository {
	return &proxyRepository{db: db}
}

func (r *proxyRepository) List(filter repository.ProxyFilter) ([]entity.Proxy, int, time.Time, error) {
	q := r.db.Model(&entity.Proxy{})

	if filter.AliveOnly {
		q = q.Where("is_alive = ?", true)
	}
	if filter.Protocol != "all" && filter.Protocol != "" {
		q = q.Where("protocol = ?", filter.Protocol)
	}
	if filter.Country != "all" && filter.Country != "" {
		q = q.Where("country_code = ?", filter.Country)
	}
	if filter.Anonymity != "all" && filter.Anonymity != "" {
		q = q.Where("anonymity = ?", filter.Anonymity)
	}

	// 统计总数
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, time.Time{}, err
	}

	// 排序
	switch filter.SortBy {
	case "uptime":
		q = q.Order("uptime_pct DESC")
	case "checked":
		q = q.Order("last_checked DESC")
	default:
		q = q.Order("latency_ms ASC")
	}

	// 分页
	offset := (filter.Page - 1) * filter.PageSize
	var proxies []entity.Proxy
	if err := q.Offset(offset).Limit(filter.PageSize).Find(&proxies).Error; err != nil {
		return nil, 0, time.Time{}, err
	}

	lastSync, _ := r.GetLastSyncTime()
	return proxies, int(total), lastSync, nil
}

func (r *proxyRepository) CountAll() (int, error) {
	var count int64
	err := r.db.Model(&entity.Proxy{}).Count(&count).Error
	return int(count), err
}

func (r *proxyRepository) CountAlive() (int, error) {
	var count int64
	err := r.db.Model(&entity.Proxy{}).Where("is_alive = ?", true).Count(&count).Error
	return int(count), err
}

func (r *proxyRepository) CountCountries() (int, error) {
	var count int64
	err := r.db.Model(&entity.Proxy{}).
		Where("is_alive = ?", true).
		Distinct("country_code").Count(&count).Error
	return int(count), err
}

func (r *proxyRepository) UpsertBatch(proxies []entity.Proxy) error {
	if len(proxies) == 0 {
		return nil
	}
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "ip"}, {Name: "port"}, {Name: "protocol"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"country_code", "country_name", "anonymity",
			"latency_ms", "uptime_pct", "last_checked", "is_alive", "updated_at",
		}),
	}).CreateInBatches(proxies, 200).Error
}

func (r *proxyRepository) GetLastSyncTime() (time.Time, error) {
	var p entity.Proxy
	err := r.db.Order("updated_at DESC").Limit(1).Select("updated_at").First(&p).Error
	if err != nil {
		return time.Time{}, err
	}
	return p.UpdatedAt, nil
}

func (r *proxyRepository) CountByCountry(protocol string) ([]repository.CountryCount, error) {
	q := r.db.Model(&entity.Proxy{}).Where("is_alive = ?", true)
	if protocol != "all" && protocol != "" {
		q = q.Where("protocol = ?", protocol)
	}
	var results []repository.CountryCount
	err := q.Select("country_code as code, country_name as name, COUNT(*) as count").
		Group("country_code, country_name").
		Order("count DESC").
		Find(&results).Error
	return results, err
}

func (r *proxyRepository) ListAll(filter repository.ProxyFilter) ([]entity.Proxy, error) {
	q := r.db.Model(&entity.Proxy{})

	if filter.AliveOnly {
		q = q.Where("is_alive = ?", true)
	}
	if filter.Protocol != "all" && filter.Protocol != "" {
		q = q.Where("protocol = ?", filter.Protocol)
	}
	if filter.Country != "all" && filter.Country != "" {
		q = q.Where("country_code = ?", filter.Country)
	}
	if filter.Anonymity != "all" && filter.Anonymity != "" {
		q = q.Where("anonymity = ?", filter.Anonymity)
	}

	switch filter.SortBy {
	case "uptime":
		q = q.Order("uptime_pct DESC")
	case "checked":
		q = q.Order("last_checked DESC")
	default:
		q = q.Order("latency_ms ASC")
	}

	var proxies []entity.Proxy
	if err := q.Limit(50000).Find(&proxies).Error; err != nil {
		return nil, err
	}
	return proxies, nil
}
