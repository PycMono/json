package ai

import (
	"PycMono/github/json/infrastructure/config"
	"fmt"
	"sync"
)

type Mgr struct {
	opts      *Options
	providers map[string]Provider
	mu        sync.RWMutex
}

var (
	mgr  *Mgr
	once sync.Once
)

func Register(cfg *config.Config) {
	opts := &Options{
		DefaultProvider:  cfg.AI.DefaultProvider,
		FallbackProvider: cfg.AI.FallbackProvider,
		TaskRouting:      cfg.AI.TaskRouting,
		Detector:         cfg.AI.Detector,
		Humanize:         cfg.AI.Humanize,
		OpenAI: PlatformConf{
			Enabled: cfg.AI.OpenAI.Enabled, APIKey: cfg.AI.OpenAI.APIKey,
			BaseURL: cfg.AI.OpenAI.BaseURL, Model: cfg.AI.OpenAI.Model,
			MaxTokens: cfg.AI.OpenAI.MaxTokens, Temperature: cfg.AI.OpenAI.Temperature,
			Timeout: cfg.AI.OpenAI.Timeout,
		},
		DeepSeek: PlatformConf{
			Enabled: cfg.AI.DeepSeek.Enabled, APIKey: cfg.AI.DeepSeek.APIKey,
			BaseURL: cfg.AI.DeepSeek.BaseURL, Model: cfg.AI.DeepSeek.Model,
			MaxTokens: cfg.AI.DeepSeek.MaxTokens, Temperature: cfg.AI.DeepSeek.Temperature,
			Timeout: cfg.AI.DeepSeek.Timeout,
		},
		Gemini: PlatformConf{
			Enabled: cfg.AI.Gemini.Enabled, APIKey: cfg.AI.Gemini.APIKey,
			BaseURL: cfg.AI.Gemini.BaseURL, Model: cfg.AI.Gemini.Model,
			MaxTokens: cfg.AI.Gemini.MaxTokens, Temperature: cfg.AI.Gemini.Temperature,
			Timeout: cfg.AI.Gemini.Timeout,
		},
		DouBao: PlatformConf{
			Enabled: cfg.AI.Doubao.Enabled, APIKey: cfg.AI.Doubao.APIKey,
			BaseURL: cfg.AI.Doubao.BaseURL, Model: cfg.AI.Doubao.Model,
			MaxTokens: cfg.AI.Doubao.MaxTokens, Temperature: cfg.AI.Doubao.Temperature,
			Timeout: cfg.AI.Doubao.Timeout,
		},
		Claude: PlatformConf{
			Enabled: cfg.AI.Claude.Enabled, APIKey: cfg.AI.Claude.APIKey,
			BaseURL: cfg.AI.Claude.BaseURL, Model: cfg.AI.Claude.Model,
			MaxTokens: cfg.AI.Claude.MaxTokens, Temperature: cfg.AI.Claude.Temperature,
			Timeout: cfg.AI.Claude.Timeout,
		},
	}

	once.Do(func() {
		f := &Mgr{
			opts:      opts,
			providers: make(map[string]Provider),
		}

		// 注册已启用且有 APIKey 的提供商
		register := func(name string, enabled bool, apiKey string, newFn func() Provider) {
			if enabled && apiKey != "" {
				f.providers[name] = newFn()
			}
		}
		register("openai", opts.OpenAI.Enabled, opts.OpenAI.APIKey, func() Provider { return NewOpenAIImpl(opts.OpenAI) })
		register("deepseek", opts.DeepSeek.Enabled, opts.DeepSeek.APIKey, func() Provider { return NewDeepSeekImpl(opts.DeepSeek) })
		register("gemini", opts.Gemini.Enabled, opts.Gemini.APIKey, func() Provider { return NewGeminiImpl(opts.Gemini) })
		register("doubao", opts.DouBao.Enabled, opts.DouBao.APIKey, func() Provider { return NewDouBaoImpl(opts.DouBao) })
		register("claude", opts.Claude.Enabled, opts.Claude.APIKey, func() Provider { return NewClaudeImpl(opts.Claude) })
		mgr = f
	})
}

func GetFactory() *Mgr { return mgr }

func (f *Mgr) GetMgr(name string) (Provider, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	if p, ok := f.providers[name]; ok {
		return p, nil
	}
	return nil, fmt.Errorf("provider '%s' not found or not enabled", name)
}

func (f *Mgr) GetMgrForTask(task string) (Provider, error) {
	// 1. 任务级路由
	if name, ok := f.opts.TaskRouting[task]; ok {
		if p, err := f.GetMgr(name); err == nil {
			return p, nil
		}
	}
	// 2. 默认提供商
	if f.opts.DefaultProvider != "" {
		if p, err := f.GetMgr(f.opts.DefaultProvider); err == nil {
			return p, nil
		}
	}
	// 3. Fallback 提供商
	if f.opts.FallbackProvider != "" {
		if p, err := f.GetMgr(f.opts.FallbackProvider); err == nil {
			return p, nil
		}
	}
	// 4. 任意可用提供商
	for _, p := range f.providers {
		if p.IsAvailable() {
			return p, nil
		}
	}
	return nil, fmt.Errorf("no AI provider available")
}

func (f *Mgr) GetDefaultProvider() (Provider, error) {
	return f.GetMgrForTask("__default__")
}
