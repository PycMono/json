package _1sms

import (
	"context"
	logsdk "github.com/PycMono/go-logger-sdk"
	"strings"
	"time"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"
)

// Syncer 从 5SIM 拉取数据并写入数据库
type Syncer struct {
	client      fiveSimGuestClient
	countryRepo repository.ISmsCountryRepository
	productRepo repository.ISmsProductRepository
	priceRepo   repository.ISmsPriceRepository
}

type fiveSimGuestClient interface {
	GetPrices(country string) (GuestPrices, error)
}

// NewSyncer 创建同步器
func NewSyncer(
	client fiveSimGuestClient,
	countryRepo repository.ISmsCountryRepository,
	productRepo repository.ISmsProductRepository,
	priceRepo repository.ISmsPriceRepository,
) *Syncer {
	return &Syncer{
		client:      client,
		countryRepo: countryRepo,
		productRepo: productRepo,
		priceRepo:   priceRepo,
	}
}

// SyncAll 全量同步（国家 + 全局价格表）
// 通常在启动时检测到 DB 为空时调用一次，或定时调用
func (s *Syncer) SyncAll(ctx context.Context) error {
	logsdk.Info(ctx, "[Syncer] 开始全量同步 5SIM 数据...")

	if err := s.SyncCountries(ctx); err != nil {
		logsdk.Error(ctx, "[Syncer] 国家同步失败", logsdk.Err(err))
		return err
	}
	if err := s.SyncPrices(ctx); err != nil {
		logsdk.Error(ctx, "[Syncer] 价格同步失败", logsdk.Err(err))
		return err
	}

	logsdk.Info(ctx, "[Syncer] 全量同步完成")
	return nil
}

// Reconcile 对比远端与本地数量，不一致时执行全量 upsert。
func (s *Syncer) Reconcile(ctx context.Context) error {
	remoteCountries, remoteProducts, remotePrices, err := s.buildSnapshot()
	if err != nil {
		return err
	}

	dbCountryCnt, err := s.countryRepo.Count(ctx)
	if err != nil {
		return err
	}
	dbProductCnt, err := s.productRepo.Count(ctx)
	if err != nil {
		return err
	}
	dbPriceCnt, err := s.priceRepo.Count(ctx)
	if err != nil {
		return err
	}

	if int64(len(remoteCountries)) == dbCountryCnt &&
		int64(len(remoteProducts)) == dbProductCnt &&
		int64(len(remotePrices)) == dbPriceCnt {
		logsdk.Info(ctx, "[Syncer] 对账通过，无需同步", logsdk.Any("country", dbCountryCnt), logsdk.Any("product", dbProductCnt), logsdk.Any("price", dbPriceCnt))
		return nil
	}

	logsdk.Info(ctx, "[Syncer] 对账不一致，开始 upsert", logsdk.Any("db_country", dbCountryCnt), logsdk.Any("remote_country", len(remoteCountries)), logsdk.Any("db_product", dbProductCnt), logsdk.Any("remote_product", len(remoteProducts)), logsdk.Any("db_price", dbPriceCnt), logsdk.Any("remote_price", len(remotePrices)))

	if err := s.countryRepo.BatchUpsert(ctx, remoteCountries); err != nil {
		return err
	}
	if err := s.productRepo.BatchUpsert(ctx, remoteProducts); err != nil {
		return err
	}
	if err := s.priceRepo.BatchUpsert(ctx, remotePrices); err != nil {
		return err
	}

	return nil
}

// SyncCountries 同步国家列表（基于价格表，因为 5SIM /guest/countries 数据较少）
func (s *Syncer) SyncCountries(ctx context.Context) error {
	logsdk.Info(ctx, "[Syncer] 同步国家列表...")

	// 用 hardcoded 的 countryISO2 / countryDisplayNames map 直接构建国家列表
	countries := buildCountryEntities()
	if err := s.countryRepo.BatchUpsert(ctx, countries); err != nil {
		return err
	}
	logsdk.Info(ctx, "[Syncer] 国家同步完成", logsdk.Any("count", len(countries)))
	return nil
}

// SyncPrices 从 5SIM 拉取全量价格表并写入 DB
func (s *Syncer) SyncPrices(ctx context.Context) error {
	logsdk.Info(ctx, "[Syncer] 从 5SIM 拉取全量价格表...")

	_, products, prices, err := s.buildSnapshot()
	if err != nil {
		return err
	}

	if err := s.productRepo.BatchUpsert(ctx, products); err != nil {
		logsdk.Error(ctx, "[Syncer] 产品同步失败", logsdk.Err(err))
	} else {
		logsdk.Info(ctx, "[Syncer] 产品同步完成", logsdk.Any("count", len(products)))
	}

	// 批量写价格
	if err := s.priceRepo.BatchUpsert(ctx, prices); err != nil {
		return err
	}
	logsdk.Info(ctx, "[Syncer] 价格同步完成", logsdk.Any("count", len(prices)))
	return nil
}

func (s *Syncer) buildSnapshot() ([]*entity.SmsCountry, []*entity.SmsProduct, []*entity.SmsPrice, error) {
	raw, err := s.client.GetPrices("")
	if err != nil {
		return nil, nil, nil, err
	}

	productSet := make(map[string]bool)
	countrySet := make(map[string]bool)
	var prices []*entity.SmsPrice
	now := time.Now()

	for country, services := range raw {
		countrySet[country] = true
		for service, operators := range services {
			productSet[service] = true
			for operator, info := range operators {
				prices = append(prices, &entity.SmsPrice{
					Country:  country,
					Product:  service,
					Operator: operator,
					Cost:     int(info.Cost * 100),
					Count:    info.Count,
					Rate:     info.Rate,
					SyncedAt: now,
				})
			}
		}
	}

	var products []*entity.SmsProduct
	for name := range productSet {
		products = append(products, &entity.SmsProduct{
			Name:        name,
			DisplayName: toDisplayName(name),
			Category:    "activation",
			Icon:        serviceIcon(name),
		})
	}

	countries := buildCountryEntities()
	if len(countrySet) > 0 {
		filtered := make([]*entity.SmsCountry, 0, len(countrySet))
		for _, c := range countries {
			if countrySet[c.Name] {
				filtered = append(filtered, c)
			}
		}
		countries = filtered
	}

	return countries, products, prices, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// 辅助函数
// ─────────────────────────────────────────────────────────────────────────────

// buildCountryEntities 从内置 map 构建国家实体列表
func buildCountryEntities() []*entity.SmsCountry {
	var list []*entity.SmsCountry
	for name, iso2 := range countryISO2 {
		display := countryDisplayNames[name]
		if display == "" {
			display = toTitleCase(name)
		}
		list = append(list, &entity.SmsCountry{
			Name:        name,
			DisplayName: display,
			ISO2:        iso2,
			Flag:        IsoToFlag(iso2),
		})
	}
	return list
}

// toDisplayName 产品名 → 显示名
func toDisplayName(name string) string {
	knownNames := map[string]string{
		"whatsapp": "WhatsApp", "telegram": "Telegram", "google": "Google",
		"facebook": "Facebook", "instagram": "Instagram", "twitter": "Twitter/X",
		"tiktok": "TikTok", "wechat": "WeChat", "amazon": "Amazon",
		"microsoft": "Microsoft", "apple": "Apple", "uber": "Uber",
		"netflix": "Netflix", "discord": "Discord", "snapchat": "Snapchat",
		"paypal": "PayPal", "airbnb": "Airbnb", "ebay": "eBay",
		"line": "LINE", "viber": "Viber",
	}
	if d, ok := knownNames[name]; ok {
		return d
	}
	return toTitleCase(name)
}

// serviceIcon 返回产品图标 key（产品名小写，供前端 PlatformIconRegistry 查找 SVG 图标）
func serviceIcon(name string) string {
	return strings.ToLower(name)
}

// toTitleCase 将下划线 / 连字符分词后首字母大写
func toTitleCase(s string) string {
	words := strings.Fields(strings.ReplaceAll(strings.ReplaceAll(s, "_", " "), "-", " "))
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}
