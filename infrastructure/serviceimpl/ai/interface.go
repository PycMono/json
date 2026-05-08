package ai

import "context"

// Provider 大模型统一接口
type Provider interface {
	Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error)
	ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error)
	GenerateImage(ctx context.Context, req ImageRequest) (*ImageResponse, error)
	GetProviderName() string
	IsAvailable() bool
}
