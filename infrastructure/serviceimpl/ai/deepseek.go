package ai

import (
	"context"
	"fmt"
)

type DeepSeekImpl struct {
	*OpenAIImpl
}

func NewDeepSeekImpl(cfg PlatformConf) *DeepSeekImpl {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.deepseek.com/v1"
	}
	if cfg.Model == "" {
		cfg.Model = "deepseek-chat"
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 60
	}
	return &DeepSeekImpl{OpenAIImpl: NewOpenAIImpl(cfg)}
}

func (p *DeepSeekImpl) GetProviderName() string { return "deepseek" }
func (p *DeepSeekImpl) IsAvailable() bool       { return p.cfg.APIKey != "" }

// Chat 调用 DeepSeek /v1/chat/completions（非流式）。
func (p *DeepSeekImpl) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	return p.chatAs(ctx, req, "deepseek")
}

// ChatStream 调用 DeepSeek /v1/chat/completions（SSE 流式）。
func (p *DeepSeekImpl) ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error) {
	return p.chatStreamAs(ctx, req)
}

// GenerateImage is not supported by DeepSeek - returns error
func (p *DeepSeekImpl) GenerateImage(ctx context.Context, req ImageRequest) (*ImageResponse, error) {
	return nil, fmt.Errorf("DeepSeek does not support image generation")
}
