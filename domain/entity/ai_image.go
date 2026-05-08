package entity

import (
	"time"
)

// AIImageTask 文生图 / 图生图任务实体
type AIImageTask struct {
	ID             uint      `gorm:"primaryKey;autoIncrement"           json:"id"`
	TaskID         string    `gorm:"type:varchar(36);uniqueIndex;not null" json:"task_id"` // UUID
	UserID         uint      `gorm:"index;default:0"                    json:"user_id"`   // 0 = 游客
	SessionKey     string    `gorm:"type:varchar(64);index"             json:"session_key"`
	Mode           string    `gorm:"type:varchar(16);not null"          json:"mode"`   // text2img | img2img
	Prompt         string    `gorm:"type:text"                          json:"prompt"` // 7天后置空
	NegativePrompt string    `gorm:"type:text"                          json:"negative_prompt"`
	ModelID        string    `gorm:"type:varchar(64)"                   json:"model_id"`
	Width          int       `gorm:"default:512"                        json:"width"`
	Height         int       `gorm:"default:512"                        json:"height"`
	BatchCount     int       `gorm:"default:1"                          json:"batch_count"`
	Steps          int       `gorm:"default:20"                         json:"steps"`
	CfgScale       float32   `gorm:"default:7"                          json:"cfg_scale"`
	Sampler        string    `gorm:"type:varchar(32);default:'euler'"   json:"sampler"`
	Seed           int64     `gorm:"default:-1"                         json:"seed"`
	HiresEnabled   bool      `gorm:"default:false"                      json:"hires_enabled"`
	DenoisingStrength float32 `gorm:"default:0.75"                      json:"denoising_strength"`
	Status         string    `gorm:"type:varchar(16);default:'pending'" json:"status"` // pending|success|failed
	ErrorMsg       string    `gorm:"type:varchar(512)"                  json:"error_msg,omitempty"`
	ResultURLs     string    `gorm:"type:json"                          json:"result_urls"` // JSON 数组
	Provider       string    `gorm:"type:varchar(32)"                   json:"provider"`    // stability|openai|sdwebui
	CostSeconds    float32   `gorm:"default:0"                          json:"cost_seconds"`
	ExpireAt       time.Time `gorm:"index"                              json:"expire_at"` // 7天后清理
	CreatedAt      time.Time `                                          json:"created_at"`
	UpdatedAt      time.Time `                                          json:"updated_at"`
}

func (AIImageTask) TableName() string { return "ai_image_tasks" }

// AIImageModel 可用模型配置实体
type AIImageModel struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ModelID     string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"model_id"` // 唯一标识
	Name        string    `gorm:"type:varchar(128);not null"           json:"name"`
	Provider    string    `gorm:"type:varchar(32);not null"            json:"provider"`  // stability|openai|sdwebui
	Category    string    `gorm:"type:varchar(32)"                     json:"category"`  // general|anime|realistic|art
	Description string    `gorm:"type:varchar(512)"                    json:"description"`
	PreviewURL  string    `gorm:"type:varchar(512)"                    json:"preview_url"`
	IsDefault   bool      `gorm:"default:false"                        json:"is_default"`
	IsActive    bool      `gorm:"default:true"                         json:"is_active"`
	SortOrder   int       `gorm:"default:0"                            json:"sort_order"`
	CreatedAt   time.Time `                                            json:"created_at"`
	UpdatedAt   time.Time `                                            json:"updated_at"`
}

func (AIImageModel) TableName() string { return "ai_image_models" }
