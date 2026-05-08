package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// noProxyTransport returns an HTTP transport that bypasses system proxy settings.
func noProxyTransport() *http.Transport {
	return &http.Transport{
		Proxy: func(*http.Request) (*url.URL, error) { return nil, nil },
	}
}

type OpenAIImpl struct {
	cfg    PlatformConf
	client *http.Client
}

func NewOpenAIImpl(cfg PlatformConf) *OpenAIImpl {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.openai.com/v1"
	}
	if cfg.Model == "" {
		cfg.Model = "gpt-4o-mini"
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 60
	}
	return &OpenAIImpl{
		cfg:    cfg,
		client: &http.Client{Timeout: time.Duration(cfg.Timeout) * time.Second, Transport: noProxyTransport()},
	}
}

func (p *OpenAIImpl) GetProviderName() string { return "openai" }
func (p *OpenAIImpl) IsAvailable() bool       { return p.cfg.APIKey != "" }

func (p *OpenAIImpl) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	return p.chatAs(ctx, req, "openai")
}

func (p *OpenAIImpl) ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error) {
	return p.chatStreamAs(ctx, req)
}

// chatAs 执行非流式请求，providerName 用于填写响应中的 Provider 字段。
func (p *OpenAIImpl) chatAs(ctx context.Context, req ChatRequest, providerName string) (*ChatResponse, error) {
	start := time.Now()

	maxTok := req.MaxTokens
	if maxTok == 0 {
		maxTok = 2000
	}
	temp := req.Temperature
	if temp == 0 {
		temp = 0.7
	}

	payload := map[string]interface{}{
		"model":       p.cfg.Model,
		"messages":    p.buildMessages(req),
		"max_tokens":  maxTok,
		"temperature": temp,
		"stream":      false,
	}
	body, _ := json.Marshal(payload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST",
		strings.TrimRight(p.cfg.BaseURL, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+p.cfg.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("%s error %d: %s", providerName, resp.StatusCode, string(raw))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("%s: no choices returned", providerName)
	}

	return &ChatResponse{
		Content:      result.Choices[0].Message.Content,
		FinishReason: result.Choices[0].FinishReason,
		Usage: TokenUsage{
			PromptTokens:     result.Usage.PromptTokens,
			CompletionTokens: result.Usage.CompletionTokens,
			TotalTokens:      result.Usage.TotalTokens,
		},
		Provider:  providerName,
		Model:     p.cfg.Model,
		LatencyMs: time.Since(start).Milliseconds(),
	}, nil
}

// chatStreamAs 执行流式请求，返回 SSE chunk channel。
func (p *OpenAIImpl) chatStreamAs(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error) {
	maxTok := req.MaxTokens
	if maxTok == 0 {
		maxTok = 2000
	}
	temp := req.Temperature
	if temp == 0 {
		temp = 0.7
	}

	payload := map[string]interface{}{
		"model":       p.cfg.Model,
		"messages":    p.buildMessages(req),
		"max_tokens":  maxTok,
		"temperature": temp,
		"stream":      true,
	}
	body, _ := json.Marshal(payload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST",
		strings.TrimRight(p.cfg.BaseURL, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+p.cfg.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("stream error %d: %s", resp.StatusCode, string(raw))
	}

	ch := make(chan StreamChunk, 16)
	go func() {
		defer close(ch)
		defer resp.Body.Close()

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				ch <- StreamChunk{Done: true}
				return
			}
			var chunk struct {
				Choices []struct {
					Delta struct {
						Content string `json:"content"`
					} `json:"delta"`
				} `json:"choices"`
			}
			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				continue
			}
			if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
				ch <- StreamChunk{Content: chunk.Choices[0].Delta.Content}
			}
		}
		if err := scanner.Err(); err != nil {
			ch <- StreamChunk{Error: err}
		}
	}()
	return ch, nil
}

func (p *OpenAIImpl) buildMessages(req ChatRequest) []map[string]string {
	var msgs []map[string]string
	if req.SystemPrompt != "" {
		msgs = append(msgs, map[string]string{"role": "system", "content": req.SystemPrompt})
	}
	for _, m := range req.Messages {
		msgs = append(msgs, map[string]string{"role": m.Role, "content": m.Content})
	}
	return msgs
}

// GenerateImage calls OpenAI DALL-E image generation API
func (p *OpenAIImpl) GenerateImage(ctx context.Context, req ImageRequest) (*ImageResponse, error) {
	start := time.Now()

	// Determine size string
	size := req.Size
	if size == "" {
		size = fmt.Sprintf("%dx%d", req.Width, req.Height)
	}

	// Map common SD sizes to DALL-E supported sizes
	size = mapDALLESize(size)

	model := req.Model
	if model == "" {
		model = "dall-e-3"
	}

	n := req.N
	if n <= 0 {
		n = 1
	}

	payload := map[string]interface{}{
		"model":  model,
		"prompt": req.Prompt,
		"n":      n,
		"size":   size,
	}
	if req.Quality != "" {
		payload["quality"] = req.Quality
	}
	if req.Style != "" {
		payload["style"] = req.Style
	}

	body, _ := json.Marshal(payload)
	httpReq, err := http.NewRequestWithContext(ctx, "POST",
		strings.TrimRight(p.cfg.BaseURL, "/")+"/images/generations", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+p.cfg.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("DALL-E error %d: %s", resp.StatusCode, string(raw))
	}

	var result struct {
		Data []struct {
			URL           string `json:"url"`
			B64JSON       string `json:"b64_json"`
			RevisedPrompt string `json:"revised_prompt"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	images := make([]GeneratedImage, len(result.Data))
	for i, d := range result.Data {
		images[i] = GeneratedImage{
			URL:           d.URL,
			B64JSON:       d.B64JSON,
			RevisedPrompt: d.RevisedPrompt,
		}
	}

	return &ImageResponse{
		Images:    images,
		Provider:  "openai",
		Model:     model,
		LatencyMs: time.Since(start).Milliseconds(),
	}, nil
}

// mapDALLESize maps arbitrary sizes to DALL-E supported sizes
func mapDALLESize(size string) string {
	supported := map[string]bool{
		"1024x1024": true,
		"1024x1792": true,
		"1792x1024": true,
		"512x512":   true, // DALL-E 2 only
		"256x256":   true, // DALL-E 2 only
	}
	if supported[size] {
		return size
	}
	// Default to 1024x1024 for unsupported sizes
	return "1024x1024"
}
