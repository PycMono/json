package sms

import (
	"context"
	"testing"

	"PycMono/github/json/domain/entity"
)

type stubCountryRepo struct {
	count int64
	all   []*entity.SmsCountry
}

func (r *stubCountryRepo) Count(ctx context.Context) (int64, error) { return r.count, nil }
func (r *stubCountryRepo) FindAll(ctx context.Context) ([]*entity.SmsCountry, error) {
	return r.all, nil
}
func (r *stubCountryRepo) FindByName(ctx context.Context, name string) (*entity.SmsCountry, error) {
	return nil, nil
}
func (r *stubCountryRepo) Upsert(ctx context.Context, country *entity.SmsCountry) error { return nil }
func (r *stubCountryRepo) BatchUpsert(ctx context.Context, countries []*entity.SmsCountry) error {
	return nil
}

type stubProductRepo struct{}

func (r *stubProductRepo) Count(ctx context.Context) (int64, error) { return 0, nil }
func (r *stubProductRepo) FindAll(ctx context.Context) ([]*entity.SmsProduct, error) {
	return nil, nil
}
func (r *stubProductRepo) FindByName(ctx context.Context, name string) (*entity.SmsProduct, error) {
	return nil, nil
}
func (r *stubProductRepo) Upsert(ctx context.Context, product *entity.SmsProduct) error { return nil }
func (r *stubProductRepo) BatchUpsert(ctx context.Context, products []*entity.SmsProduct) error {
	return nil
}

type stubPriceRepo struct {
	count     int64
	all       []*entity.SmsPrice
	byCountry map[string][]*entity.SmsPrice
}

func (r *stubPriceRepo) Count(ctx context.Context) (int64, error) { return r.count, nil }
func (r *stubPriceRepo) FindByCountry(ctx context.Context, country string) ([]*entity.SmsPrice, error) {
	if r.byCountry == nil {
		return nil, nil
	}
	return r.byCountry[country], nil
}
func (r *stubPriceRepo) FindAll(ctx context.Context) ([]*entity.SmsPrice, error) { return r.all, nil }
func (r *stubPriceRepo) FindByCountryAndProduct(ctx context.Context, country, product string) ([]*entity.SmsPrice, error) {
	return nil, nil
}
func (r *stubPriceRepo) Upsert(ctx context.Context, price *entity.SmsPrice) error { return nil }
func (r *stubPriceRepo) BatchUpsert(ctx context.Context, prices []*entity.SmsPrice) error {
	return nil
}

func TestGetProductsForCountryAnyFromDB(t *testing.T) {
	prices := []*entity.SmsPrice{
		{Country: "russia", Product: "whatsapp", Operator: "any", Cost: 40, Count: 10},
		{Country: "russia", Product: "whatsapp", Operator: "mts", Cost: 35, Count: 7},
		{Country: "usa", Product: "whatsapp", Operator: "any", Cost: 60, Count: 5},
		{Country: "russia", Product: "telegram", Operator: "any", Cost: 30, Count: 8},
	}

	svc := NewSMSServiceWithDB(
		&stubCountryRepo{},
		&stubProductRepo{},
		&stubPriceRepo{count: int64(len(prices)), all: prices},
	)

	items, err := svc.GetProductsForCountry("any")
	if err != nil {
		t.Fatalf("GetProductsForCountry(any) unexpected error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 products, got %d", len(items))
	}

	got := map[string]ProductItem{}
	for _, it := range items {
		got[it.Name] = it
	}

	if got["whatsapp"].Qty != 22 {
		t.Fatalf("whatsapp qty mismatch: want 22, got %d", got["whatsapp"].Qty)
	}
	if got["whatsapp"].Price != 35 {
		t.Fatalf("whatsapp price mismatch: want 35, got %d", got["whatsapp"].Price)
	}
	if got["telegram"].Qty != 8 {
		t.Fatalf("telegram qty mismatch: want 8, got %d", got["telegram"].Qty)
	}
}

func TestGetPricesAllFromDB(t *testing.T) {
	prices := []*entity.SmsPrice{
		{Country: "russia", Product: "whatsapp", Operator: "any", Cost: 38, Count: 200, Rate: 88.2},
		{Country: "india", Product: "telegram", Operator: "any", Cost: 24, Count: 150, Rate: 86.4},
	}

	svc := NewSMSServiceWithDB(
		&stubCountryRepo{},
		&stubProductRepo{},
		&stubPriceRepo{count: int64(len(prices)), all: prices},
	)

	items, err := svc.GetPricesAll()
	if err != nil {
		t.Fatalf("GetPricesAll unexpected error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(items))
	}
	if items[0].Country != "russia" || items[0].Product != "whatsapp" {
		t.Fatalf("unexpected first row: %#v", items[0])
	}
}

func TestGetCountriesFromDB(t *testing.T) {
	svc := NewSMSServiceWithDB(
		&stubCountryRepo{
			count: 2,
			all: []*entity.SmsCountry{
				{Name: "russia", DisplayName: "Russia", Flag: "RU"},
				{Name: "usa", DisplayName: "United States", Flag: "US"},
			},
		},
		&stubProductRepo{},
		&stubPriceRepo{},
	)

	items, err := svc.GetCountries()
	if err != nil {
		t.Fatalf("GetCountries unexpected error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 countries, got %d", len(items))
	}
	if items[0].Name != "russia" || items[1].Name != "usa" {
		t.Fatalf("unexpected countries: %#v", items)
	}
}

func TestGetCountriesFallbackWhenDBEmpty(t *testing.T) {
	svc := NewSMSServiceWithDB(
		&stubCountryRepo{count: 0},
		&stubProductRepo{},
		&stubPriceRepo{},
	)

	items, err := svc.GetCountries()
	if err != nil {
		t.Fatalf("GetCountries fallback unexpected error: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected fallback countries, got empty list")
	}
}
