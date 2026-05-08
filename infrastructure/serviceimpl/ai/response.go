package ai

// ChatResponse 统一响应格式
type ChatResponse struct {
	Content      string     `json:"content"`
	FinishReason string     `json:"finish_reason"`
	Usage        TokenUsage `json:"usage"`
	Provider     string     `json:"provider"`
	Model        string     `json:"model"`
	LatencyMs    int64      `json:"latency_ms"`
}

type StreamChunk struct {
	Content string `json:"content"`
	Done    bool   `json:"done"`
	Error   error  `json:"error,omitempty"`
}

type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ImageResponse 图片生成响应
type ImageResponse struct {
	Images    []GeneratedImage `json:"images"`
	Provider  string           `json:"provider"`
	Model     string           `json:"model"`
	LatencyMs int64            `json:"latency_ms"`
}

// GeneratedImage 单张生成的图片
type GeneratedImage struct {
	URL           string `json:"url,omitempty"`
	B64JSON       string `json:"b64_json,omitempty"`
	RevisedPrompt string `json:"revised_prompt,omitempty"`
}
