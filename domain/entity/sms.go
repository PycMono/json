package entity

import "time"

// SmsCountry 国家实体
type SmsCountry struct {
	ID          uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name" gorm:"column:name;uniqueIndex;size:64;not null"`     // 5SIM 内部 key，如 "russia"
	DisplayName string    `json:"displayName" gorm:"column:display_name;size:128;not null"` // 显示名，如 "Russia"
	ISO2        string    `json:"iso2" gorm:"column:iso2;size:4;not null"`                  // ISO 3166-1 alpha-2，如 "RU"
	Flag        string    `json:"flag" gorm:"column:flag;size:16;not null"`                 // Emoji 旗帜
	CreatedAt   time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// SmsProduct 产品/服务实体
type SmsProduct struct {
	ID          uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name" gorm:"column:name;uniqueIndex;size:64;not null"`                  // 5SIM 内部 key，如 "whatsapp"
	DisplayName string    `json:"displayName" gorm:"column:display_name;size:128;not null"`              // 显示名，如 "WhatsApp"
	Category    string    `json:"category" gorm:"column:category;size:32;not null;default:'activation'"` // "activation"
	Icon        string    `json:"icon" gorm:"column:icon;size:64;not null"`                              // 图标 key 或 Emoji
	CreatedAt   time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// SmsPrice 价格条目实体
type SmsPrice struct {
	ID       uint64  `json:"id" gorm:"primaryKey;autoIncrement"`
	Country  string  `json:"country" gorm:"column:country;size:64;not null;index:idx_country_product;uniqueIndex:uk_country_product_operator"` // 国家 5SIM key
	Product  string  `json:"product" gorm:"column:product;size:64;not null;index:idx_country_product;uniqueIndex:uk_country_product_operator"` // 产品 5SIM key
	Operator string  `json:"operator" gorm:"column:operator;size:64;not null;default:'any';uniqueIndex:uk_country_product_operator"`           // 运营商，"any" 表示任意
	Cost     int     `json:"cost" gorm:"column:cost;not null;default:0"`                                                                       // 价格（分）
	Count    int     `json:"count" gorm:"column:count;not null;default:0"`                                                                     // 可用库存
	Rate     float64 `json:"rate" gorm:"column:rate;not null;default:0"`                                                                       // 成功率

	SyncedAt  time.Time `json:"syncedAt" gorm:"column:synced_at"`
	CreatedAt time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (SmsCountry) TableName() string { return "sms_country" }
func (SmsProduct) TableName() string { return "sms_product" }
func (SmsPrice) TableName() string   { return "sms_price" }
