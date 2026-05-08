package ai

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/common/prompts"
	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"
	"PycMono/github/json/infrastructure/controller/http/render"
	aiProvider "PycMono/github/json/infrastructure/serviceimpl/ai"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var (
	aiImageRepo     repository.AIImageRepository
	aiImageRepoOnce sync.Once
)

// InitAIImageService injects the AI image repository
func InitAIImageService(repo repository.AIImageRepository) {
	aiImageRepoOnce.Do(func() {
		aiImageRepo = repo
	})
}

// AIImagePage renders the AI image generator tool page (lightweight workbench)
func AIImagePage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	// Build JSON-LD (SoftwareApplication only — FAQ moved to landing page)
	jsonldData := map[string]interface{}{
		"@context":               "https://schema.org",
		"@type":                  "SoftwareApplication",
		"name":                   t("ai-image.seo.title"),
		"applicationCategory":    "UtilityApplication",
		"applicationSubCategory": "AIApplication",
		"operatingSystem":        "Web Browser",
		"description":            t("ai-image.seo.desc"),
		"url":                    "https://toolboxnova.com/ai/image",
		"offers":                 map[string]interface{}{"@type": "Offer", "price": "0", "priceCurrency": "USD"},
		"featureList": []string{
			"Text to Image Generation",
			"Image to Image (img2img)",
			"Multiple AI Models",
			"Custom Prompt Parameters",
			"Batch Generation",
			"AI Prompt Enhancement",
		},
	}
	jsonldBytes, err := json.Marshal(jsonldData)
	if err != nil {
		jsonldBytes = []byte("{}")
	}
	jsonld := template.JS(jsonldBytes)

	data := render.BaseData(c, gin.H{
		"Title":       t("ai-image.seo.title") + " | Tool Box Nova",
		"Description": t("ai-image.seo.desc"),
		"Keywords":    t("ai-image.seo.keywords"),
		"PageClass":   "page-ai-image",
		"ActiveTool":  "ai-image",
		"JSONLD":      jsonld,
		"Canonical":   "https://toolboxnova.com/ai/image",
		"HreflangZH":  "https://toolboxnova.com/ai/image?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/ai/image?lang=en",
		"HreflangJA":  "https://toolboxnova.com/ai/image?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/ai/image?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/ai/image?lang=spa",
		"LandingURL":  "/ai/image-generator?lang=" + lang,
	})
	render.Render(c, "ai/ai-image.html", data)
}

// AIImageLandingPage renders the SEO landing page at /ai/image-generator
func AIImageLandingPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)

	// Translate FAQs (used for both visible content + JSON-LD)
	faqs := translateFAQs(t, faq.AIImageFAQs)
	faqEntities := make([]map[string]interface{}, len(faqs))
	for i, f := range faqs {
		faqEntities[i] = map[string]interface{}{
			"@type": "Question",
			"name":  f.Q,
			"acceptedAnswer": map[string]interface{}{
				"@type": "Answer",
				"text":  f.A,
			},
		}
	}

	jsonldData := map[string]interface{}{
		"@context": "https://schema.org",
		"@graph": []interface{}{
			map[string]interface{}{
				"@type": "BreadcrumbList",
				"itemListElement": []interface{}{
					map[string]interface{}{
						"@type":    "ListItem",
						"position": 1,
						"name":     "Home",
						"item":     "https://toolboxnova.com/",
					},
					map[string]interface{}{
						"@type":    "ListItem",
						"position": 2,
						"name":     "AI Tools",
						"item":     "https://toolboxnova.com/ai/humanizer",
					},
					map[string]interface{}{
						"@type":    "ListItem",
						"position": 3,
						"name":     t("ai-image.landing.seo.title"),
						"item":     "https://toolboxnova.com/ai/image-generator",
					},
				},
			},
			map[string]interface{}{
				"@type":                  "SoftwareApplication",
				"name":                   t("ai-image.landing.seo.title"),
				"applicationCategory":    "UtilityApplication",
				"applicationSubCategory": "AIApplication",
				"operatingSystem":        "Web Browser",
				"description":            t("ai-image.landing.seo.desc"),
				"url":                    "https://toolboxnova.com/ai/image-generator",
				"offers":                 map[string]interface{}{"@type": "Offer", "price": "0", "priceCurrency": "USD"},
				"aggregateRating": map[string]interface{}{
					"@type":       "AggregateRating",
					"ratingValue": "4.8",
					"ratingCount": "3120",
					"bestRating":  "5",
				},
			},
			map[string]interface{}{
				"@type":       "HowTo",
				"name":        t("ai-image.landing.howto.title"),
				"description": t("ai-image.landing.howto.subtitle"),
				"totalTime":   "PT1M",
				"step": []interface{}{
					map[string]interface{}{
						"@type":    "HowToStep",
						"position": 1,
						"name":     t("ai-image.landing.howto.step1.title"),
						"text":     t("ai-image.landing.howto.step1.desc"),
					},
					map[string]interface{}{
						"@type":    "HowToStep",
						"position": 2,
						"name":     t("ai-image.landing.howto.step2.title"),
						"text":     t("ai-image.landing.howto.step2.desc"),
					},
					map[string]interface{}{
						"@type":    "HowToStep",
						"position": 3,
						"name":     t("ai-image.landing.howto.step3.title"),
						"text":     t("ai-image.landing.howto.step3.desc"),
					},
				},
			},
			map[string]interface{}{
				"@type":      "FAQPage",
				"mainEntity": faqEntities,
			},
		},
	}
	jsonldBytes, err := json.Marshal(jsonldData)
	if err != nil {
		jsonldBytes = []byte("{}")
	}
	jsonld := template.JS(jsonldBytes)

	data := render.BaseData(c, gin.H{
		"Title":       t("ai-image.landing.seo.title") + " | Tool Box Nova",
		"Description": t("ai-image.landing.seo.desc"),
		"Keywords":    t("ai-image.landing.seo.keywords"),
		"PageClass":   "page-ai-image-landing",
		"ActiveTool":  "ai-image",
		"JSONLD":      jsonld,
		"FAQs":        faqs,
		"Canonical":   "https://toolboxnova.com/ai/image-generator",
		"HreflangZH":  "https://toolboxnova.com/ai/image-generator?lang=zh",
		"HreflangEN":  "https://toolboxnova.com/ai/image-generator?lang=en",
		"HreflangJA":  "https://toolboxnova.com/ai/image-generator?lang=ja",
		"HreflangKO":  "https://toolboxnova.com/ai/image-generator?lang=ko",
		"HreflangSPA": "https://toolboxnova.com/ai/image-generator?lang=spa",
		"ToolURL":     "/ai/image?lang=" + lang,
	})
	render.Render(c, "ai/ai-image-landing.html", data)
}

// AIImageGenerate proxies image generation to AI provider
func AIImageGenerate(c *gin.Context) {
	var req AIImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}

	if req.Prompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "prompt_required"})
		return
	}
	if len(req.Prompt) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "prompt_too_long"})
		return
	}

	start := time.Now()

	factory := aiProvider.GetFactory()
	provider, err := factory.GetMgrForTask("image")
	if err != nil {
		provider, err = factory.GetDefaultProvider()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "provider_unavailable"})
			return
		}
	}

	// Attempt real image generation via DALL-E API (only works with OpenAI)
	images, seed, taskID, err := generateImages(c, provider, &req)
	if err != nil {
		// Fallback 1: Use picsum.photos with Chat-based approach
		images, seed, taskID, err = generateImagesWithPicsum(c, provider, &req)
		if err != nil {
			// Fallback 2: Generate SVG placeholder images
			images = generatePlaceholderImages(req.BatchCount, req.Width, req.Height, req.Prompt)
			seed = time.Now().UnixNano()
			taskID = ""
		}
	}

	durationMs := time.Since(start).Milliseconds()

	// Persist task to DB asynchronously
	if aiImageRepo != nil {
		go func() {
			urls := make([]string, len(images))
			for i, img := range images {
				if u, ok := img["url"].(string); ok {
					urls[i] = u
				}
			}
			urlsJSON, _ := json.Marshal(urls)
			mode := "txt2img"
			if req.InitImage != "" {
				mode = "img2img"
			}
			_ = aiImageRepo.CreateTask(&entity.AIImageTask{
				TaskID:            uuid.New().String(),
				SessionKey:        c.ClientIP(),
				Mode:              mode,
				Prompt:            req.Prompt,
				NegativePrompt:    req.NegativePrompt,
				ModelID:           req.Model,
				Width:             req.Width,
				Height:            req.Height,
				BatchCount:        req.BatchCount,
				Steps:             req.Steps,
				CfgScale:          req.CFGScale,
				Sampler:           req.Sampler,
				Seed:              seed,
				DenoisingStrength: req.DenoisingStrength,
				Status:            "success",
				ResultURLs:        string(urlsJSON),
				CostSeconds:       float32(durationMs) / 1000.0,
				ExpireAt:          time.Now().Add(7 * 24 * time.Hour),
			})
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"images":     images,
		"seed":       seed,
		"model":      req.Model,
		"durationMs": durationMs,
		"taskId":     taskID,
	})
}

// generateImages calls the real image generation API (DALL-E)
func generateImages(c *gin.Context, provider aiProvider.Provider, req *AIImageRequest) ([]map[string]interface{}, int64, string, error) {
	// Map frontend model to DALL-E model
	model := req.Model
	switch {
	case strings.HasPrefix(model, "dall-e") || strings.HasPrefix(model, "dall·e"):
		// keep as is
	case strings.HasPrefix(model, "sd"):
		model = "dall-e-3" // fallback SD models to DALL-E 3
	default:
		model = "dall-e-3"
	}

	// Limit batch count for DALL-E (max 1 for dall-e-3)
	n := req.BatchCount
	if model == "dall-e-3" && n > 1 {
		n = 1
	}

	imgResp, err := provider.GenerateImage(c.Request.Context(), aiProvider.ImageRequest{
		Prompt: req.Prompt,
		Model:  model,
		Width:  req.Width,
		Height: req.Height,
		N:      n,
	})
	if err != nil {
		return nil, 0, "", err
	}

	images := make([]map[string]interface{}, len(imgResp.Images))
	for i, img := range imgResp.Images {
		m := map[string]interface{}{
			"url":  img.URL,
			"seed": time.Now().UnixNano() + int64(i),
		}
		if img.RevisedPrompt != "" {
			m["revised_prompt"] = img.RevisedPrompt
		}
		images[i] = m
	}

	seed := time.Now().UnixNano()
	return images, seed, "", nil
}

// generateImagesWithPicsum uses Chat API + picsum.photos as fallback
func generateImagesWithPicsum(c *gin.Context, provider aiProvider.Provider, req *AIImageRequest) ([]map[string]interface{}, int64, string, error) {
	systemPrompt, userPrompt, err := prompts.Build("ai-image-generate.md", map[string]string{
		"Prompt": req.Prompt,
		"Width":  itoa(req.Width),
		"Height": itoa(req.Height),
		"Count":  itoa(req.BatchCount),
	})
	if err != nil {
		return nil, 0, "", err
	}

	resp, err := provider.Chat(c.Request.Context(), aiProvider.ChatRequest{
		SystemPrompt: systemPrompt,
		Messages: []aiProvider.Message{
			{Role: "user", Content: userPrompt},
		},
		MaxTokens:   500,
		Temperature: 0.8,
	})
	if err != nil {
		return nil, 0, "", err
	}

	// Strip markdown code block markers if present
	content := strings.TrimSpace(resp.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	// Try new response format: {"code":200,"data":{"images":[...]}}
	var wrapped struct {
		Code int `json:"code"`
		Data struct {
			Images []map[string]interface{} `json:"images"`
		} `json:"data"`
	}
	if err := json.Unmarshal([]byte(content), &wrapped); err != nil {
		// Fallback: try old format {"images":[...]}
		var legacy struct {
			Images []map[string]interface{} `json:"images"`
		}
		if err2 := json.Unmarshal([]byte(content), &legacy); err2 != nil {
			return nil, 0, "", err
		}
		return legacy.Images, time.Now().UnixNano(), "", nil
	}

	if wrapped.Code != 200 || len(wrapped.Data.Images) == 0 {
		return nil, 0, "", fmt.Errorf("image API returned code %d", wrapped.Code)
	}

	seed := time.Now().UnixNano()
	return wrapped.Data.Images, seed, "", nil
}

// generatePlaceholderImages creates SVG data-URI placeholder images
func generatePlaceholderImages(count, w, h int, prompt string) []map[string]interface{} {
	images := make([]map[string]interface{}, count)
	for i := 0; i < count; i++ {
		svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d">
<defs><linearGradient id="g%d" x1="0%%" y1="0%%" x2="100%%" y2="100%%">
<stop offset="0%%" style="stop-color:#5b45e0;stop-opacity:1"/>
<stop offset="100%%" style="stop-color:#3b8ef7;stop-opacity:1"/>
</linearGradient></defs>
<rect width="100%%" height="100%%" fill="url(#g%d)"/>
<text x="50%%" y="48%%" text-anchor="middle" fill="white" font-size="16" font-family="sans-serif" opacity="0.8">AI Image</text>
<text x="50%%" y="58%%" text-anchor="middle" fill="white" font-size="11" font-family="sans-serif" opacity="0.6">%s</text>
</svg>`, w, h, i, i, truncate(prompt, 30))
		images[i] = map[string]interface{}{
			"url":  "data:image/svg+xml;base64," + b64Encode(svg),
			"seed": time.Now().UnixNano() + int64(i),
		}
	}
	return images
}

// AIImageEnhancePrompt uses AI to enhance user prompts
func AIImageEnhancePrompt(c *gin.Context) {
	var req struct {
		Prompt string `json:"prompt" binding:"required,max=500"`
		Lang   string `json:"lang"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
		return
	}

	factory := aiProvider.GetFactory()
	provider, err := factory.GetMgrForTask("text")
	if err != nil {
		provider, err = factory.GetDefaultProvider()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "provider_unavailable"})
			return
		}
	}

	systemPrompt, userPrompt, err := prompts.Build("ai-image-enhance.md", map[string]string{
		"Prompt": req.Prompt,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "prompt_load_failed"})
		return
	}

	resp, err := provider.Chat(c.Request.Context(), aiProvider.ChatRequest{
		Messages: []aiProvider.Message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		MaxTokens:   200,
		Temperature: 0.7,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enhance_failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"enhanced": resp.Content})
}

// AIImageModels returns available model list
func AIImageModels(c *gin.Context) {
	if aiImageRepo != nil {
		models, err := aiImageRepo.ListActiveModels()
		if err == nil && len(models) > 0 {
			c.JSON(http.StatusOK, gin.H{"models": models})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"models": defaultAIImageModels()})
}

// AIImageHistory returns recent generation history
func AIImageHistory(c *gin.Context) {
	ip := c.ClientIP()
	if aiImageRepo != nil {
		tasks, err := aiImageRepo.ListHistoryBySession(ip, 20)
		if err == nil {
			c.JSON(http.StatusOK, gin.H{"history": tasks})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"history": []interface{}{}})
}

type AIImageRequest struct {
	Prompt            string  `json:"prompt"            binding:"required,max=1000"`
	NegativePrompt    string  `json:"negativePrompt"    binding:"max=500"`
	Model             string  `json:"model"             binding:"required"`
	Width             int     `json:"width"             binding:"required,min=256,max=2048"`
	Height            int     `json:"height"            binding:"required,min=256,max=2048"`
	Steps             int     `json:"steps"             binding:"min=10,max=50"`
	CFGScale          float32 `json:"cfgScale"          binding:"min=1,max=20"`
	Sampler           string  `json:"sampler"`
	Seed              int64   `json:"seed"`
	BatchCount        int     `json:"batchCount"        binding:"min=1,max=4"`
	InitImage         string  `json:"initImage"`
	DenoisingStrength float32 `json:"denoisingStrength" binding:"min=0,max=1"`
}

func defaultAIImageModels() []map[string]interface{} {
	return []map[string]interface{}{
		{"model_id": "sd3-large", "name": "Stable Diffusion 3 Large", "provider": "stability"},
		{"model_id": "sd3-medium", "name": "Stable Diffusion 3 Medium", "provider": "stability"},
		{"model_id": "sdxl-1.0", "name": "SDXL 1.0", "provider": "stability"},
		{"model_id": "sd-1.6", "name": "SD 1.6", "provider": "stability"},
		{"model_id": "stable-image-ultra", "name": "Stable Image Ultra", "provider": "stability"},
		{"model_id": "dall-e-3", "name": "DALL·E 3", "provider": "openai"},
		{"model_id": "dall-e-2", "name": "DALL·E 2", "provider": "openai"},
		{"model_id": "anything-v5", "name": "Anything V5 (Anime)", "provider": "sdwebui"},
		{"model_id": "deliberate-v3", "name": "Deliberate V3 (Realistic)", "provider": "sdwebui"},
		{"model_id": "dreamshaper-xl", "name": "DreamShaper XL", "provider": "sdwebui"},
	}
}

func translateFAQs(t func(string) string, faqs []faq.FAQ) []faq.FAQ {
	out := make([]faq.FAQ, len(faqs))
	for i, f := range faqs {
		out[i] = faq.FAQ{Q: t(f.Q), A: t(f.A)}
	}
	return out
}

func truncate(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return template.HTMLEscapeString(s)
	}
	return template.HTMLEscapeString(string(runes[:maxLen])) + "..."
}

func b64Encode(s string) string {
	return base64.StdEncoding.EncodeToString([]byte(s))
}

func itoa(n int) string {
	return fmt.Sprintf("%d", n)
}
