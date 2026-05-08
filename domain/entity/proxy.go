package entity

import "time"

// ProxyProtocol 代理协议枚举
type ProxyProtocol string

const (
	ProxyProtocolHTTP   ProxyProtocol = "http"
	ProxyProtocolHTTPS  ProxyProtocol = "https"
	ProxyProtocolSOCKS4 ProxyProtocol = "socks4"
	ProxyProtocolSOCKS5 ProxyProtocol = "socks5"
)

// ProxyAnonymity 匿名度枚举
type ProxyAnonymity string

const (
	ProxyAnonymityTransparent ProxyAnonymity = "transparent"
	ProxyAnonymityAnonymous   ProxyAnonymity = "anonymous"
	ProxyAnonymityElite       ProxyAnonymity = "elite"
)

// Proxy 代理服务器实体
type Proxy struct {
	ID          uint64         `gorm:"primaryKey;autoIncrement"`
	IP          string         `gorm:"type:varchar(45);not null;uniqueIndex:idx_proxy_ip_port_proto"`
	Port        int            `gorm:"type:smallint unsigned;not null;uniqueIndex:idx_proxy_ip_port_proto"`
	Protocol    ProxyProtocol  `gorm:"type:enum('http','https','socks4','socks5');not null;default:'http';uniqueIndex:idx_proxy_ip_port_proto;index"`
	CountryCode string         `gorm:"type:char(2);not null;default:'';index"`
	CountryName string         `gorm:"type:varchar(100);not null;default:''"`
	Anonymity   ProxyAnonymity `gorm:"type:enum('transparent','anonymous','elite');not null;default:'anonymous';index"`
	LatencyMs   int            `gorm:"type:int;not null;default:0;index"`
	UptimePct   float32        `gorm:"type:decimal(5,2);not null;default:0;index"`
	LastChecked time.Time      `gorm:"type:datetime;not null;index"`
	IsAlive     bool           `gorm:"type:tinyint(1);not null;default:1;index"`
	Source      string         `gorm:"type:varchar(50);not null;default:'proxyscrape'"`
	CreatedAt   time.Time
	UpdatedAt   time.Time      `gorm:"index"`
}

func (Proxy) TableName() string { return "proxies" }
