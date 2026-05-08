package repository

import (
	"time"

	"PycMono/github/json/domain/entity"
)

// ProxyFilter 查询过滤条件
type ProxyFilter struct {
	Protocol  string
	Country   string
	Anonymity string
	SortBy    string
	Page      int
	PageSize  int
	AliveOnly bool
}

// CountryCount 国家代理计数
type CountryCount struct {
	Code  string
	Name  string
	Count int
}

// ProxyRepository 代理数据仓储接口
type ProxyRepository interface {
	List(filter ProxyFilter) ([]entity.Proxy, int, time.Time, error)
	CountAll() (int, error)
	CountAlive() (int, error)
	CountCountries() (int, error)
	CountByCountry(protocol string) ([]CountryCount, error)
	ListAll(filter ProxyFilter) ([]entity.Proxy, error)
	UpsertBatch(proxies []entity.Proxy) error
	GetLastSyncTime() (time.Time, error)
}
