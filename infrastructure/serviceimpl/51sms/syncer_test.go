package _1sms

import (
	"context"
	"testing"

	"PycMono/github/json/domain/entity"
)

type fakeGuestClient struct {
	prices GuestPrices
}

func (f *fakeGuestClient) GetPrices(country string) (GuestPrices, error) {
	return f.prices, nil
}

type memCountryRepo struct {
	items map[string]*entity.SmsCountry
}

func (r *memCountryRepo) Count(ctx context.Context) (int64, error) { return int64(len(r.items)), nil }
func (r *memCountryRepo) FindAll(ctx context.Context) ([]*entity.SmsCountry, error) {
	out := make([]*entity.SmsCountry, 0, len(r.items))
	for _, v := range r.items {
		out = append(out, v)
	}
	return out, nil
}
func (r *memCountryRepo) FindByName(ctx context.Context, name string) (*entity.SmsCountry, error) {
	return r.items[name], nil
}
func (r *memCountryRepo) Upsert(ctx context.Context, country *entity.SmsCountry) error {
	if r.items == nil {
		r.items = map[string]*entity.SmsCountry{}
	}
	r.items[country.Name] = country
	return nil
}
func (r *memCountryRepo) BatchUpsert(ctx context.Context, countries []*entity.SmsCountry) error {
	if r.items == nil {
		r.items = map[string]*entity.SmsCountry{}
	}
	for _, c := range countries {
		r.items[c.Name] = c
	}
	return nil
}

type memProductRepo struct {
	items map[string]*entity.SmsProduct
}

func (r *memProductRepo) Count(ctx context.Context) (int64, error) { return int64(len(r.items)), nil }
func (r *memProductRepo) FindAll(ctx context.Context) ([]*entity.SmsProduct, error) {
	out := make([]*entity.SmsProduct, 0, len(r.items))
	for _, v := range r.items {
		out = append(out, v)
	}
	return out, nil
}
func (r *memProductRepo) FindByName(ctx context.Context, name string) (*entity.SmsProduct, error) {
	return r.items[name], nil
}
func (r *memProductRepo) Upsert(ctx context.Context, product *entity.SmsProduct) error {
	if r.items == nil {
		r.items = map[string]*entity.SmsProduct{}
	}
	r.items[product.Name] = product
	return nil
}
func (r *memProductRepo) BatchUpsert(ctx context.Context, products []*entity.SmsProduct) error {
	if r.items == nil {
		r.items = map[string]*entity.SmsProduct{}
	}
	for _, p := range products {
		r.items[p.Name] = p
	}
	return nil
}

type memPriceRepo struct {
	items map[string]*entity.SmsPrice
}

func (r *memPriceRepo) Count(ctx context.Context) (int64, error) { return int64(len(r.items)), nil }
func (r *memPriceRepo) FindByCountry(ctx context.Context, country string) ([]*entity.SmsPrice, error) {
	var out []*entity.SmsPrice
	for _, v := range r.items {
		if v.Country == country {
			out = append(out, v)
		}
	}
	return out, nil
}
func (r *memPriceRepo) FindAll(ctx context.Context) ([]*entity.SmsPrice, error) {
	out := make([]*entity.SmsPrice, 0, len(r.items))
	for _, v := range r.items {
		out = append(out, v)
	}
	return out, nil
}
func (r *memPriceRepo) FindByCountryAndProduct(ctx context.Context, country, product string) ([]*entity.SmsPrice, error) {
	var out []*entity.SmsPrice
	for _, v := range r.items {
		if v.Country == country && v.Product == product {
			out = append(out, v)
		}
	}
	return out, nil
}
func (r *memPriceRepo) Upsert(ctx context.Context, price *entity.SmsPrice) error {
	if r.items == nil {
		r.items = map[string]*entity.SmsPrice{}
	}
	key := price.Country + ":" + price.Product + ":" + price.Operator
	r.items[key] = price
	return nil
}
func (r *memPriceRepo) BatchUpsert(ctx context.Context, prices []*entity.SmsPrice) error {
	if r.items == nil {
		r.items = map[string]*entity.SmsPrice{}
	}
	for _, p := range prices {
		key := p.Country + ":" + p.Product + ":" + p.Operator
		r.items[key] = p
	}
	return nil
}

func TestReconcileUpsertsWhenCountMismatch(t *testing.T) {
	client := &fakeGuestClient{prices: GuestPrices{
		"russia": {
			"whatsapp": {
				"any": {Cost: 0.38, Count: 120, Rate: 88},
			},
		},
	}}
	countries := &memCountryRepo{items: map[string]*entity.SmsCountry{}}
	products := &memProductRepo{items: map[string]*entity.SmsProduct{}}
	prices := &memPriceRepo{items: map[string]*entity.SmsPrice{}}

	s := NewSyncer(client, countries, products, prices)
	if err := s.Reconcile(context.Background()); err != nil {
		t.Fatalf("reconcile error: %v", err)
	}

	if len(countries.items) == 0 || len(products.items) == 0 || len(prices.items) == 0 {
		t.Fatalf("expected repos to be upserted, got country=%d product=%d price=%d", len(countries.items), len(products.items), len(prices.items))
	}
}

func TestReconcileSkipsWhenCountsMatch(t *testing.T) {
	client := &fakeGuestClient{prices: GuestPrices{
		"russia": {
			"whatsapp": {
				"any": {Cost: 0.38, Count: 120, Rate: 88},
			},
		},
	}}
	countries := &memCountryRepo{items: map[string]*entity.SmsCountry{"russia": {Name: "russia"}}}
	products := &memProductRepo{items: map[string]*entity.SmsProduct{"whatsapp": {Name: "whatsapp"}}}
	prices := &memPriceRepo{items: map[string]*entity.SmsPrice{"russia:whatsapp:any": {Country: "russia", Product: "whatsapp", Operator: "any"}}}

	s := NewSyncer(client, countries, products, prices)
	if err := s.Reconcile(context.Background()); err != nil {
		t.Fatalf("reconcile error: %v", err)
	}

	if len(countries.items) != 1 || len(products.items) != 1 || len(prices.items) != 1 {
		t.Fatal("expected reconcile to keep existing counts unchanged")
	}
}
