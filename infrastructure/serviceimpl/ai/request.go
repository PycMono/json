package ai

// ChatRequest 统一请求格式
type ChatRequest struct {
	Messages     []Message `json:"messages"`
	SystemPrompt string    `json:"system_prompt"`
	MaxTokens    int       `json:"max_tokens"`
	Temperature  float64   `json:"temperature"`
}

type Message struct {
	Role    string `json:"role"` // "user" / "assistant" / "system"
	Content string `json:"content"`
}

// ImageRequest 图片生成请求
type ImageRequest struct {
	Prompt         string  `json:"prompt"`
	NegativePrompt string  `json:"negative_prompt,omitempty"`
	Model          string  `json:"model"` // dall-e-3, dall-e-2, sd3-large, etc.
	Size           string  `json:"size"`  // 1024x1024, 512x512, etc.
	Width          int     `json:"width,omitempty"`
	Height         int     `json:"height,omitempty"`
	N              int     `json:"n"` // number of images
	Quality        string  `json:"quality,omitempty"` // standard, hd (for DALL-E 3)
	Style          string  `json:"style,omitempty"`   // vivid, natural (for DALL-E 3)
}
