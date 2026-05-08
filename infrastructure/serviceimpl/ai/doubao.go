package ai

import (
	"context"
	"fmt"
)

type DouBaoImpl struct {
	*OpenAIImpl
}

func NewDouBaoImpl(cfg PlatformConf) *DouBaoImpl {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://ark.cn-beijing.volces.com/api/v3"
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 60
	}
	return &DouBaoImpl{OpenAIImpl: NewOpenAIImpl(cfg)}
}

func (p *DouBaoImpl) GetProviderName() string { return "doubao" }
func (p *DouBaoImpl) IsAvailable() bool       { return p.cfg.APIKey != "" }

// Chat 调用豆包 /api/v3/chat/completions（非流式）。
func (p *DouBaoImpl) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	return p.chatAs(ctx, req, "doubao")
}

// ChatStream 调用豆包 /api/v3/chat/completions（SSE 流式）。
func (p *DouBaoImpl) ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error) {
	return p.chatStreamAs(ctx, req)
}

// GenerateImage is not supported by DouBao - returns error
func (p *DouBaoImpl) GenerateImage(ctx context.Context, req ImageRequest) (*ImageResponse, error) {
	return nil, fmt.Errorf("DouBao does not support image generation")
}
