package config

import "github.com/jinzhu/configor"

type Config struct {
	// 服务基础
	Port         string `json:"port"          default:"8086"                    env:"PORT"`
	Debug        bool   `json:"debug"         default:"false"                   env:"DEBUG"`
	SiteURL      string `json:"site_url"      default:"https://toolboxnova.com" env:"SITE_URL"`
	AssetVersion string `json:"asset_version" default:"v1"                      env:"ASSET_VERSION"`

	// 通知
	SMSAPIKey   string `json:"sms_api_key"   default:"" env:"SMS_API_KEY"`
	EmailAPIKey string `json:"email_api_key" default:"" env:"EMAIL_API_KEY"`

	// 广告 & Analytics
	GoogleAdsID     string `json:"google_ads_id"     default:"" env:"GOOGLE_ADS_ID"`
	EnableAds       bool   `json:"enable_ads"        default:"false" env:"ENABLE_ADS"`
	GAMeasurementID string `json:"ga_measurement_id" default:"" env:"GA_MEASUREMENT_ID"`
	EnableGA        bool   `json:"enable_ga"         default:"true" env:"ENABLE_GA"`

	// Google Ads Conversion Tracking
	GoogleAdsConversionID        string `json:"google_ads_conversion_id"          default:"" env:"GOOGLE_ADS_CONVERSION_ID"`
	GoogleAdsConversionLabel     string `json:"google_ads_conversion_label"       default:"" env:"GOOGLE_ADS_CONVERSION_LABEL"`
	GoogleAdsConversionLabelSMS  string `json:"google_ads_conversion_label_sms"   default:"" env:"GOOGLE_ADS_CONVERSION_LABEL_SMS"`
	GoogleAdsConversionLabelTool string `json:"google_ads_conversion_label_tool"  default:"" env:"GOOGLE_ADS_CONVERSION_LABEL_TOOL"`

	// Cookie Consent (GDPR / CCPA)
	ConsentCookieName string `json:"consent_cookie_name" default:"cky_consent"     env:"CONSENT_COOKIE_NAME"`
	Domain            string `json:"domain"              default:"toolboxnova.com" env:"DOMAIN"`

	// Social Media Links
	TwitterURL  string `json:"twitter_url"  default:"https://twitter.com/toolboxnova"`
	GitHubURL   string `json:"github_url"   default:"https://github.com/toolboxnova"`
	LinkedInURL string `json:"linkedin_url" default:"https://www.linkedin.com/company/toolboxnova"`

	// Newsletter
	NewsletterEnabled  bool   `json:"newsletter_enabled"  default:"false"`
	NewsletterProvider string `json:"newsletter_provider" default:""` // "mailchimp" | "buttondown" | ""

	// Image Tools
	OCRSpaceAPIKey string `json:"ocr_space_api_key" default:"" env:"OCR_SPACE_API_KEY"`

	// Security (Anti-Scraping)
	Security SecurityConfig `json:"security"`

	// Temp Email SMTP Receiver
	TempEmail TempEmailConfig `json:"temp_email"`

	// Redis
	Redis RedisConfig `json:"redis"`

	// MySQL
	MySQL MySQLConfig `json:"mysql"`

	// AI
	AI AIConfig `json:"ai"`

	// OAuth
	OAuth OAuthConfig `json:"oauth"`

	// Admin 管理员配置
	Admin AdminConfig `json:"admin"`
}

// AdminConfig 管理员配置
type AdminConfig struct {
	Emails    []string `json:"emails"     default:"[]"`
	EmailList string   `json:"email_list" default:"" env:"ADMIN_EMAILS"` // 逗号分隔，优先于 Emails
}

// SecurityConfig 安全防护配置
type SecurityConfig struct {
	IPBlacklist        []string `json:"ip_blacklist"        default:"[]"`
	IPCIDR             []string `json:"ip_cidr"             default:"[]"`
	AutoBlockIPs       bool     `json:"auto_block_ips"       default:"false"`
	GrayThreshold      int      `json:"gray_threshold"      default:"5"`
	BlockDuration      int      `json:"block_duration"      default:"15"`       // minutes
	FreqLimitHTML      int      `json:"freq_limit_html"      default:"60"`       // per minute
	FreqLimitStatic    int      `json:"freq_limit_static"    default:"200"`      // per minute
	FreqLimitWindow    int      `json:"freq_limit_window"    default:"60"`       // seconds
	HoneypotEnabled    bool     `json:"honeypot_enabled"     default:"true"`
	ChallengeEnabled   bool     `json:"challenge_enabled"    default:"false"`
	TurnstileSiteKey   string   `json:"turnstile_site_key"    default:"" env:"TURNSTILE_SITE_KEY"`
	TurnstileSecretKey string   `json:"turnstile_secret_key"  default:"" env:"TURNSTILE_SECRET_KEY"`
}

// TempEmailConfig 临时邮件 SMTP 接收配置
type TempEmailConfig struct {
	Enabled             bool     `json:"enabled"                default:"false"`
	SMTPPort            int      `json:"smtp_port"              default:"2525"`
	Domains             []string `json:"domains"`
	TTLSeconds          int      `json:"ttl_seconds"            default:"600"`
	MaxMessageSize      int64    `json:"max_message_size"       default:"5242880"` // 5MB
	MaxMessagesPerInbox int      `json:"max_messages_per_inbox" default:"100"`
}

// RedisConfig Redis 连接配置（cache + session 两个客户端）
type RedisClientConfig struct {
	ClientName string `json:"client_name" default:""`
	Addr       string `json:"addr"        default:"localhost:6379" env:"REDIS_ADDR"`
	Password   string `json:"password"    default:""              env:"REDIS_PASSWORD"`
	PoolSize   int    `json:"poolsize"    default:"5"`
	DB         int    `json:"db"          default:"0"`
}

type RedisConfig struct {
	Cache   RedisClientConfig `json:"cache"`
	Session RedisClientConfig `json:"session"`
}

// OAuthConfig OAuth 登录配置
type OAuthConfig struct {
	SiteURL           string `json:"site_url"            default:"https://toolboxnova.com"`
	SessionCookieName string `json:"session_cookie_name" default:"tbn_session"`
	SessionTTLHours   int    `json:"session_ttl_hours"   default:"720"`
	SessionSecure     bool   `json:"session_secure"      default:"true"`
	StateTTLMinutes   int    `json:"state_ttl_minutes"   default:"10"`
	Google            GoogleOAuthConfig     `json:"google"`
	Microsoft         MicrosoftOAuthConfig  `json:"microsoft"`
}

type GoogleOAuthConfig struct {
	ClientID     string `json:"client_id"     default:"" env:"OAUTH_GOOGLE_CLIENT_ID"`
	ClientSecret string `json:"client_secret" default:"" env:"OAUTH_GOOGLE_CLIENT_SECRET"`
}

type MicrosoftOAuthConfig struct {
	ClientID     string `json:"client_id"     default:"" env:"OAUTH_MICROSOFT_CLIENT_ID"`
	ClientSecret string `json:"client_secret" default:"" env:"OAUTH_MICROSOFT_CLIENT_SECRET"`
	Tenant       string `json:"tenant"        default:"common"`
}

// MySQLConfig MySQL 连接配置
type MySQLConfig struct {
	Enabled         bool   `json:"enabled"          default:"false"`
	Host            string `json:"host"             default:"127.0.0.1"     env:"MYSQL_HOST"`
	Port            int    `json:"port"             default:"3306"          env:"MYSQL_PORT"`
	User            string `json:"user"             default:"root"          env:"MYSQL_USER"`
	Password        string `json:"password"         default:""              env:"MYSQL_PASSWORD"`
	DBName          string `json:"db_name"          default:"toolboxnova"   env:"MYSQL_DB_NAME"`
	Charset         string `json:"charset"          default:"utf8mb4"`
	MaxIdleConns    int    `json:"max_idle_conns"   default:"10"`
	MaxOpenConns    int    `json:"max_open_conns"   default:"100"`
	ConnMaxLifetime int    `json:"conn_max_lifetime" default:"3600"` // seconds
}

// ProviderConfig 每个 AI 提供商的通用配置
type ProviderConfig struct {
	Enabled     bool    `json:"enabled"     default:"false"`
	APIKey      string  `json:"api_key"     default:"" env:"API_KEY"`
	BaseURL     string  `json:"base_url"    default:"" env:"BASE_URL"`
	Model       string  `json:"model"       default:"" env:"MODEL"`
	MaxTokens   int     `json:"max_tokens"  default:"2000"`
	Temperature float64 `json:"temperature" default:"0.7"`
	Timeout     int     `json:"timeout"     default:"60"`
}

// AIConfig AI 路由 + 各提供商配置
type AIConfig struct {
	DefaultProvider  string            `json:"default_provider"  default:"deepseek"`
	FallbackProvider string            `json:"fallback_provider" default:"openai"`
	TaskRouting      map[string]string `json:"task_routing"` // task -> provider
	Detector         string            `json:"detector"          default:"deepseek"`
	Humanize         string            `json:"humanize"          default:"openai"`

	OpenAI   ProviderConfig `json:"openai"`
	DeepSeek ProviderConfig `json:"deepseek"`
	Gemini   ProviderConfig `json:"gemini"`
	Doubao   ProviderConfig `json:"doubao"`
	Claude   ProviderConfig `json:"claude"`
}

var cfg Config

func Load() *Config {
	if err := configor.Load(&cfg, "config.json"); err != nil {
		panic(err)
	}
	return &cfg
}

func MustLoad() *Config {
	config := Load()
	return config
}
