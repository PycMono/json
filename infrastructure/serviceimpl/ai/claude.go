package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type ClaudeImpl struct {
	cfg    PlatformConf
	client *http.Client
}

func NewClaudeImpl(cfg PlatformConf) *ClaudeImpl {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.anthropic.com"
	}
	if cfg.Model == "" {
		cfg.Model = "claude-sonnet-4-6"
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 120
	}
	return &ClaudeImpl{
		cfg:    cfg,
		client: &http.Client{Timeout: time.Duration(cfg.Timeout) * time.Second, Transport: noProxyTransport()},
	}
}

func (p *ClaudeImpl) GetProviderName() string { return "claude" }
func (p *ClaudeImpl) IsAvailable() bool       { return p.cfg.APIKey != "" }

func (p *ClaudeImpl) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
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
		"max_tokens":  maxTok,
		"temperature": temp,
		"messages":    p.buildMessages(req),
	}
	if req.SystemPrompt != "" {
		payload["system"] = req.SystemPrompt
	}
	body, _ := json.Marshal(payload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST",
		strings.TrimRight(p.cfg.BaseURL, "/")+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	p.setHeaders(httpReq)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("claude error %d: %s", resp.StatusCode, string(raw))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
			Type string `json:"type"`
		} `json:"content"`
		StopReason string `json:"stop_reason"`
		Usage      struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	content := ""
	for _, c := range result.Content {
		if c.Type == "text" {
			content += c.Text
		}
	}

	return &ChatResponse{
		Content:      content,
		FinishReason: result.StopReason,
		Usage: TokenUsage{
			PromptTokens:     result.Usage.InputTokens,
			CompletionTokens: result.Usage.OutputTokens,
			TotalTokens:      result.Usage.InputTokens + result.Usage.OutputTokens,
		},
		Provider:  "claude",
		Model:     p.cfg.Model,
		LatencyMs: time.Since(start).Milliseconds(),
	}, nil
}

func (p *ClaudeImpl) ChatStream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error) {
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
		"max_tokens":  maxTok,
		"temperature": temp,
		"stream":      true,
		"messages":    p.buildMessages(req),
	}
	if req.SystemPrompt != "" {
		payload["system"] = req.SystemPrompt
	}
	body, _ := json.Marshal(payload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST",
		strings.TrimRight(p.cfg.BaseURL, "/")+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	p.setHeaders(httpReq)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("claude stream error %d: %s", resp.StatusCode, string(raw))
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

			var event struct {
				Type  string `json:"type"`
				Delta struct {
					Text string `json:"text"`
				} `json:"delta"`
				Message struct {
					StopReason string `json:"stop_reason"`
				} `json:"message"`
			}
			if err := json.Unmarshal([]byte(data), &event); err != nil {
				continue
			}

			switch event.Type {
			case "content_block_delta":
				if event.Delta.Text != "" {
					ch <- StreamChunk{Content: event.Delta.Text}
				}
			case "message_stop", "message_delta":
				if event.Message.StopReason != "" || event.Type == "message_stop" {
					ch <- StreamChunk{Done: true}
					return
				}
			}
		}
		if err := scanner.Err(); err != nil {
			ch <- StreamChunk{Error: err}
		}
	}()
	return ch, nil
}

func (p *ClaudeImpl) setHeaders(req *http.Request) {
	req.Header.Set("x-api-key", p.cfg.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("Content-Type", "application/json")
}

func (p *ClaudeImpl) buildMessages(req ChatRequest) []map[string]string {
	msgs := make([]map[string]string, 0, len(req.Messages))
	for _, m := range req.Messages {
		if m.Role == "system" {
			continue // Claude uses separate system field
		}
		msgs = append(msgs, map[string]string{"role": m.Role, "content": m.Content})
	}
	return msgs
}

// GenerateImage is not supported by Claude - returns error
func (p *ClaudeImpl) GenerateImage(ctx context.Context, req ImageRequest) (*ImageResponse, error) {
	return nil, fmt.Errorf("Claude does not support image generation")
}
