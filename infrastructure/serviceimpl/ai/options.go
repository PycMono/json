package ai

// Options ai 初始化可选参数
type Options struct {
	DefaultProvider  string            `json:"default_provider"`
	FallbackProvider string            `json:"fallback_provider"`
	TaskRouting      map[string]string `json:"task_routing"`
	Detector         string            `json:"detector"`
	Humanize         string            `json:"humanize"`
	OpenAI           PlatformConf      `json:"openai"`
	DeepSeek         PlatformConf      `json:"deepseek"`
	Gemini           PlatformConf      `json:"gemini"`
	DouBao           PlatformConf      `json:"doubao"`
	Claude           PlatformConf      `json:"claude"`
}

// PlatformConf 大模型平台配置
type PlatformConf struct {
	Enabled     bool    `json:"enabled"`
	APIKey      string  `json:"api_key"`
	BaseURL     string  `json:"base_url"`
	Model       string  `json:"model"`
	MaxTokens   int     `json:"max_tokens"`
	Temperature float64 `json:"temperature"`
	Timeout     int     `json:"timeout"`
}
