package sms

import (
	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"
	"PycMono/github/json/infrastructure/serviceimpl/51sms"
	"context"
	"fmt"
	logsdk "github.com/PycMono/go-logger-sdk"
	"sort"
	"strings"
	"sync"
	"time"
)

// SMSService 业务层，封装 5SIM 客户端，带缓存
// DB 不为空时优先从数据库读取，DB 为空时降级到 5SIM API
type Service struct {
	Client      *_1sms.FiveSimClient // 导出，供 WebSocket handler 直接使用
	cache       *SimpleCache
	countryRepo repository.ISmsCountryRepository
	productRepo repository.ISmsProductRepository
	priceRepo   repository.ISmsPriceRepository
}

// NewSMSService ...
func NewSMSService() *Service {
	return &Service{
		Client: _1sms.NewFiveSimClient(),
		cache:  NewSimpleCache(5 * time.Minute),
	}
}

// NewSMSServiceWithDB 创建带 DB 仓储的 SMSService
func NewSMSServiceWithDB(
	countryRepo repository.ISmsCountryRepository,
	productRepo repository.ISmsProductRepository,
	priceRepo repository.ISmsPriceRepository,
) *Service {
	return &Service{
		Client:      _1sms.NewFiveSimClient(),
		cache:       NewSimpleCache(5 * time.Minute),
		countryRepo: countryRepo,
		productRepo: productRepo,
		priceRepo:   priceRepo,
	}
}

// dbEnabled 是否启用了数据库
func (s *Service) dbEnabled() bool {
	return s.countryRepo != nil && s.productRepo != nil && s.priceRepo != nil
}

// ── 国家 ──────────────────────────────────────────────────────────────────────

// GetCountries DB 优先返回国家列表，DB 为空时返回内置 map
func (s *Service) GetCountries() ([]CountryItem, error) {
	cacheKey := "countries:all"
	if cached, ok := s.cache.Get(cacheKey); ok {
		return cached.([]CountryItem), nil
	}

	// 从 DB 读
	if s.dbEnabled() {
		ctx := context.Background()
		cnt, err := s.countryRepo.Count(ctx)
		if err == nil && cnt > 0 {
			entities, err := s.countryRepo.FindAll(ctx)
			if err != nil {
				return nil, err
			}
			items := make([]CountryItem, 0, len(entities))
			for _, e := range entities {
				items = append(items, CountryItem{
					Name:        e.Name,
					DisplayName: e.DisplayName,
					Flag:        e.Flag,
				})
			}
			s.cache.Set(cacheKey, items)
			return items, nil
		}
	}

	// 降级：从内置 map 构建
	items := buildCountryItemsFromMap()
	s.cache.Set(cacheKey, items)
	return items, nil
}

// buildCountryItemsFromMap 从内置 countryDisplayNames 构建国家列表
func buildCountryItemsFromMap() []CountryItem {
	items := make([]CountryItem, 0, len(countryDisplayNames))
	for name, display := range countryDisplayNames {
		items = append(items, CountryItem{
			Name:        name,
			DisplayName: display,
			Flag:        CountryFlag(name),
		})
	}
	return items
}

// ── 产品 ──────────────────────────────────────────────────────────────────────

// GetProductsForCountry DB 优先获取产品列表（TTL 5 分钟）
func (s *Service) GetProductsForCountry(country string) ([]ProductItem, error) {
	cacheKey := "products:" + country
	if cached, ok := s.cache.Get(cacheKey); ok {
		return cached.([]ProductItem), nil
	}

	// DB 优先：DB 有数据时，仅从本地价格表聚合（不再回落 5SIM）
	if s.dbEnabled() {
		ctx := context.Background()
		cnt, err := s.priceRepo.Count(ctx)
		if err == nil && cnt > 0 {
			var priceEntities []*entity.SmsPrice
			if country == "" || strings.EqualFold(country, "any") {
				priceEntities, err = s.priceRepo.FindAll(ctx)
			} else {
				priceEntities, err = s.priceRepo.FindByCountry(ctx, country)
			}
			if err != nil {
				return nil, err
			}

			items := aggregateProductsFromPrices(priceEntities)
			s.cache.Set(cacheKey, items)
			return items, nil
		}
	}

	// DB 为空或无 DB 时降级到 5SIM Guest API
	return s.fetchProductsFromAPI(country)
}

// fetchProductsFromAPI 从 5SIM Guest API 拉取产品列表（无需鉴权）
func (s *Service) fetchProductsFromAPI(country string) ([]ProductItem, error) {
	c := "any"
	if country != "" {
		c = country
	}
	gp, err := s.Client.GetProducts(c, "any")
	if err != nil {
		logsdk.Error(context.TODO(), "[SMS] 5SIM GetProducts fallback failed", logsdk.Any("country", c), logsdk.Err(err))
		return []ProductItem{}, nil
	}
	items := make([]ProductItem, 0, len(gp))
	for name, p := range gp {
		items = append(items, ProductItem{
			Name:        name,
			DisplayName: ToDisplayName(name),
			Category:    p.Category,
			Qty:         p.Qty,
			Price:       int(p.Price * 100),
		})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Qty > items[j].Qty })
	return items, nil
}

// ── 价格 ──────────────────────────────────────────────────────────────────────

// GetPricesAll DB 优先获取全量价格表（TTL 5 分钟）
func (s *Service) GetPricesAll() ([]PriceItem, error) {
	cacheKey := "prices:all"
	if cached, ok := s.cache.Get(cacheKey); ok {
		return cached.([]PriceItem), nil
	}

	// DB 优先
	if s.dbEnabled() {
		ctx := context.Background()
		cnt, err := s.priceRepo.Count(ctx)
		if err == nil && cnt > 0 {
			entities, err := s.priceRepo.FindAll(ctx)
			if err != nil {
				return nil, err
			}
			items := make([]PriceItem, len(entities))
			for i, e := range entities {
				items[i] = PriceItem{
					Country:  e.Country,
					Product:  e.Product,
					Operator: e.Operator,
					Cost:     e.Cost,
					Count:    e.Count,
					Rate:     e.Rate,
				}
			}
			s.cache.Set(cacheKey, items)
			return items, nil
		}
	}

	// DB 为空或无 DB 时降级到 5SIM Guest API
	return s.fetchPricesFromAPI()
}

// fetchPricesFromAPI 从 5SIM Guest API 拉取全量价格表（无需鉴权）
func (s *Service) fetchPricesFromAPI() ([]PriceItem, error) {
	raw, err := s.Client.GetPrices("")
	if err != nil {
		logsdk.Error(context.TODO(), "[SMS] 5SIM GetPrices fallback failed", logsdk.Err(err))
		return []PriceItem{}, nil
	}
	items := make([]PriceItem, 0)
	for country, services := range raw {
		for service, operators := range services {
			for operator, info := range operators {
				items = append(items, PriceItem{
					Country:  country,
					Product:  service,
					Operator: operator,
					Cost:     int(info.Cost * 100),
					Count:    info.Count,
					Rate:     info.Rate,
				})
			}
		}
	}
	return items, nil
}

// GetPrice 获取单个产品的价格（分为单位）
func (s *Service) GetPrice(product, country, operator string) (int, error) {
	prices, err := s.GetPricesAll()
	if err != nil {
		return 0, err
	}
	for _, p := range prices {
		if p.Product == product && p.Country == country && p.Operator == operator {
			return p.Cost, nil
		}
	}
	return 0, fmt.Errorf("price not found for %s/%s/%s", product, country, operator)
}

// ── 订单操作 ──────────────────────────────────────────────────────────────────

// BuyActivationNumber 购号（转发到 5SIM）
func (s *Service) BuyActivationNumber(product, country, operator string) (*_1sms.FiveSimOrder, error) {
	return s.Client.BuyActivationNumber(country, operator, product)
}

// CheckOrder 查询订单（字符串 ID → int）
func (s *Service) CheckOrder(orderID string) (*_1sms.FiveSimOrder, error) {
	var id int
	fmt.Sscanf(orderID, "%d", &id)
	return s.Client.CheckOrder(id)
}

// CancelOrder 取消订单
func (s *Service) CancelOrder(orderID string) error {
	var id int
	fmt.Sscanf(orderID, "%d", &id)
	return s.Client.CancelOrder(id)
}

// FinishOrder 完成订单
func (s *Service) FinishOrder(orderID string) error {
	var id int
	fmt.Sscanf(orderID, "%d", &id)
	return s.Client.FinishOrder(id)
}

// ── 简单内存缓存 ──────────────────────────────────────────────────────────────

type cacheEntry struct {
	value     interface{}
	expiresAt time.Time
}

// SimpleCache 线程安全的内存缓存
type SimpleCache struct {
	mu   sync.RWMutex
	data map[string]cacheEntry
	ttl  time.Duration
}

// NewSimpleCache 创建缓存，并启动后台清理 goroutine
func NewSimpleCache(ttl time.Duration) *SimpleCache {
	c := &SimpleCache{
		data: make(map[string]cacheEntry),
		ttl:  ttl,
	}
	go c.cleanupLoop()
	return c
}

// Get 获取缓存值，过期返回 false
func (c *SimpleCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	entry, ok := c.data[key]
	if !ok || time.Now().After(entry.expiresAt) {
		return nil, false
	}
	return entry.value, true
}

// Set 设置缓存值
func (c *SimpleCache) Set(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = cacheEntry{
		value:     value,
		expiresAt: time.Now().Add(c.ttl),
	}
}

// cleanupLoop 每 10 分钟清理过期条目
func (c *SimpleCache) cleanupLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.data {
			if now.After(v.expiresAt) {
				delete(c.data, k)
			}
		}
		c.mu.Unlock()
	}
}

// ── 数据结构 ──────────────────────────────────────────────────────────────────

// ProductItem 产品条目（API 响应格式）
type ProductItem struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Category    string `json:"category"`
	Qty         int    `json:"qty"`
	Price       int    `json:"price"` // 分
}

// PriceItem 价格条目（API 响应格式）
type PriceItem struct {
	Country  string  `json:"country"`
	Product  string  `json:"product"`
	Operator string  `json:"operator"`
	Cost     int     `json:"cost"` // 分
	Count    int     `json:"count"`
	Rate     float64 `json:"rate"`
}

// CountryItem 国家条目（API 响应格式）
type CountryItem struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Flag        string `json:"flag"`
	Qty         int    `json:"qty"`
}

func aggregateProductsFromPrices(priceEntities []*entity.SmsPrice) []ProductItem {
	if len(priceEntities) == 0 {
		return []ProductItem{}
	}

	type productAgg struct {
		qty   int
		price int
	}

	agg := make(map[string]*productAgg)
	for _, p := range priceEntities {
		current, ok := agg[p.Product]
		if !ok {
			agg[p.Product] = &productAgg{qty: p.Count, price: p.Cost}
			continue
		}
		current.qty += p.Count
		if p.Cost < current.price {
			current.price = p.Cost
		}
	}

	items := make([]ProductItem, 0, len(agg))
	for product, a := range agg {
		items = append(items, ProductItem{
			Name:        product,
			DisplayName: ToDisplayName(product),
			Category:    "activation",
			Qty:         a.qty,
			Price:       a.price,
		})
	}

	return items
}
