// Package humanizer implements the AI text humanization engine using
// strategy + factory pattern. It wraps the existing aiservice layer.
package ai

import (
	"PycMono/github/json/common/prompts"
	"PycMono/github/json/infrastructure/serviceimpl/ai"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

// HumanizeRequest is the inbound request for humanization.
type HumanizeRequest struct {
	Text              string   `json:"text"`
	Mode              string   `json:"mode"` // basic|standard|aggressive|academic|creative|business
	Tone              string   `json:"tone"` // neutral|formal|casual
	PreserveFormat    bool     `json:"preserve_format"`
	PreserveCitations bool     `json:"preserve_citations"`
	Strength          int      `json:"strength"`        // 1-5 rewrite intensity (default 3)
	Dialect           string   `json:"dialect"`         // us|uk|au|ca (English only)
	FrozenKeywords    []string `json:"frozen_keywords"` // keywords to preserve during rewrite
	Purpose           string   `json:"purpose"`         // general|academic|marketing|seo|business etc.
	SEOKeywords       []string `json:"seo_keywords"`    // SEO keywords to maintain density
	CustomStyle       string   `json:"custom_style"`    // user's writing style sample (200+ chars)
	DocType           string   `json:"doc_type"`        // essay|report|thesis|proposal (college/professor modes)
	Style             string   `json:"style"`           // writing style for article/paragraph rewrite
}

// HumanizeResponse is the non-streaming response.
type HumanizeResponse struct {
	Text      string `json:"text"`
	TokensIn  int    `json:"tokens_in"`
	TokensOut int    `json:"tokens_out"`
	Provider  string `json:"provider"`
}

// DetectRequest is the inbound request for AI detection.
type DetectRequest struct {
	Text    string `json:"text"`
	DocType string `json:"doc_type"` // essay|report|thesis (academic detection)
	Field   string `json:"field"`    // academic field (computer_science|biology|etc.)
}

// PlagiarismRequest is the inbound request for plagiarism checking.
type PlagiarismRequest struct {
	Text     string `json:"text"`
	Language string `json:"language"`
	DeepScan bool   `json:"deep_scan"`
}

// PlagiarismMatchedSource represents a matched source from plagiarism check.
type PlagiarismMatchedSource struct {
	Title      string  `json:"title"`
	URL        string  `json:"url,omitempty"`
	Similarity float64 `json:"similarity"`
	Type       string  `json:"type"` // "web" | "academic" | "book" | "unknown"
}

// PlagiarismSentence represents a sentence with plagiarism analysis.
type PlagiarismSentence struct {
	Text       string  `json:"text"`
	Type       string  `json:"type"` // "original" | "plagiarized" | "ai" | "mixed"
	Similarity float64 `json:"similarity"`
	Reason     string  `json:"reason,omitempty"`
}

// PlagiarismResponse is the plagiarism check result.
type PlagiarismResponse struct {
	PlagiarismScore int                       `json:"plagiarism_score"` // 0-100
	AIScore         int                       `json:"ai_score"`         // 0-100
	Verdict         string                    `json:"verdict"`          // "original" | "plagiarized" | "mixed"
	MatchedSources  []PlagiarismMatchedSource `json:"matched_sources"`
	Sentences       []PlagiarismSentence      `json:"sentences"`
	Recommendations []string                  `json:"recommendations"`
	WordCount       int                       `json:"word_count"`
}

// DetectionResult contains the core detection metadata.
type DetectionResult struct {
	AIScore             float64 `json:"ai_score"`
	HumanScore          float64 `json:"human_score"`
	ConfidenceLevel     float64 `json:"confidence_level"`
	Label               string  `json:"label"` // "ai" | "human" | "mixed" | "uncertain"
	DetectedGenre       string  `json:"detected_genre"`
	DetectedModel       string  `json:"detected_model_signature"`
	AntiEvasionDetected bool    `json:"anti_evasion_detected"`
	CalibrationNotes    string  `json:"calibration_notes"`
}

// LinguisticMetrics contains quantitative text analysis metrics.
type LinguisticMetrics struct {
	SentenceLengthSD        float64 `json:"sentence_length_sd"`
	ParagraphCV             float64 `json:"paragraph_cv"`
	TTRScore                float64 `json:"ttr_score"`
	BurstinessScore         int     `json:"burstiness_score"`
	LexicalDiversity        int     `json:"lexical_diversity"`
	Perplexity              string  `json:"perplexity"` // "Low" | "Medium" | "High"
	SyntacticPredictability string  `json:"syntactic_predictability"`
	RhetoricalDiversity     int     `json:"rhetorical_diversity"`
	PersonalAnchorCount     int     `json:"personal_anchor_count"`
}

// ForensicEvidence represents a single piece of evidence in the analysis.
type ForensicEvidence struct {
	Dimension     string `json:"dimension"` // Statistical | Syntactic | Semantic | Stylistic | ModelSignature | AntiEvasion
	Type          string `json:"type"`      // Specific evidence type
	Detail        string `json:"detail"`    // Detailed description
	OriginalQuote string `json:"original_quote"`
	Severity      string `json:"severity"` // "Critical" | "High" | "Medium" | "Low"
}

// HighlightedSentence represents a sentence with AI analysis.
type HighlightedSentence struct {
	Sentence      string  `json:"sentence"`
	Reason        string  `json:"reason"`
	AIProbability float64 `json:"ai_probability"`
}

// ModelSignatureAnalysis contains model fingerprint matching scores.
type ModelSignatureAnalysis struct {
	GPTMatchScore       float64 `json:"gpt_match_score"`
	ClaudeMatchScore    float64 `json:"claude_match_score"`
	DeepSeekGeminiScore float64 `json:"deepseek_gemini_match_score"`
	DominantSignature   string  `json:"dominant_signature"`
}

// DetectResponse is the full AI detection result.
type DetectResponse struct {
	AIScore    float64 `json:"ai_score"`
	HumanScore float64 `json:"human_score"`
	Confidence float64 `json:"confidence_level"`
	Label      string  `json:"label"` // "ai" | "human" | "mixed" | "uncertain"

	// Extended fields from detect-ai.md prompt
	DetectionResult      DetectionResult        `json:"detection_result"`
	LinguisticMetrics    LinguisticMetrics      `json:"linguistic_metrics"`
	ForensicEvidence     []ForensicEvidence     `json:"forensic_evidence"`
	HighlightedSentences []HighlightedSentence  `json:"highlighted_sentences"`
	ModelSignature       ModelSignatureAnalysis `json:"model_signature_analysis"`
	VerdictSummary       string                 `json:"verdict_summary"`
	ConfidenceReasoning  string                 `json:"confidence_reasoning"`
}

// ─── Prompt Geter ───────────────────────────────────────────────────────────

// ─── Strategy (mode → provider selection) ───────────────────────────────────

// modeAliases maps frontend-only modes to prompt-file modes.
var modeAliases = map[string]string{
	"free":              "standard",
	"smart":             "standard",
	"easy":              "basic",
	"formal":            "business",
	"casual":            "standard",
	"ultra":             "aggressive",
	"simple":            "standard",
	"flowing":           "standard",
	"informal":          "standard",
	"expand":            "creative",
	"sentence-rewrite":  "sentence-rewrite",
	"paragraph-rewrite": "paragraph-rewrite",
	"article-rewrite":   "article-rewrite",
	"college":           "college",
	"professor":         "professor",
	"essay":             "essay",
}

// resolveMode returns the canonical mode for prompt loading and temperature lookup.
func resolveMode(mode string) string {
	if alias, ok := modeAliases[mode]; ok {
		return alias
	}
	return mode
}

// modeToTemperature maps humanization mode to LLM temperature.
func modeToTemperature(mode string) float64 {
	switch mode {
	case "basic", "easy":
		return 0.5
	case "standard", "free", "smart", "casual", "simple", "flowing", "informal":
		return 0.7
	case "aggressive", "ultra":
		return 0.9
	case "academic":
		return 0.6
	case "creative", "expand":
		return 1.0
	case "business", "formal":
		return 0.5
	case "essay":
		return 0.7
	case "sentence-rewrite":
		return 0.6
	case "paragraph-rewrite":
		return 0.7
	case "article-rewrite":
		return 0.7
	case "college":
		return 0.6
	case "professor":
		return 0.5
	default:
		return 0.7
	}
}

// modePreference returns ordered provider names for a given mode.
func modePreference(mode string) []string {
	switch mode {
	case "aggressive", "academic":
		return []string{"claude", "openai", "gemini", "deepseek", "doubao"}
	case "creative":
		return []string{"openai", "gemini", "claude", "deepseek", "doubao"}
	default: // basic, standard, business
		return []string{"deepseek", "doubao", "openai", "gemini", "claude"}
	}
}

// ─── Engine ─────────────────────────────────────────────────────────────────

// Engine is the main humanizer engine combining strategy + factory.
type Engine struct {
	factory *ai.Mgr
	loader  *prompts.PromptMgr
}

// NewEngine creates a new humanizer Engine.
func NewEngine(factory *ai.Mgr) *Engine {
	return &Engine{
		factory: factory,
		loader:  prompts.NewPromptMgr(),
	}
}

func (e *Engine) selectProvider(mode string) (ai.Provider, error) {
	for _, name := range modePreference(mode) {
		if p, err := e.factory.GetMgr(name); err == nil && p.IsAvailable() {
			return p, nil
		}
	}
	return e.factory.GetDefaultProvider()
}

func (e *Engine) Humanize(ctx context.Context, req HumanizeRequest) (*HumanizeResponse, error) {
	if req.Mode == "" {
		req.Mode = "standard"
	}
	if req.Tone == "" {
		req.Tone = "neutral"
	}

	mode := resolveMode(req.Mode)
	promptKey := "humanize-" + mode + ".md"
	p, err := prompts.Get(promptKey)
	if err != nil {
		return nil, err
	}

	provider, err := e.selectProvider(mode)
	if err != nil {
		return nil, fmt.Errorf("no provider available: %w", err)
	}

	userPrompt := buildUser(req, p.GetTpl())

	chatReq := ai.ChatRequest{
		SystemPrompt: p.GetSystem(),
		Messages: []ai.Message{
			{Role: "user", Content: userPrompt},
		},
		Temperature: modeToTemperature(mode),
		MaxTokens:   8192,
	}

	resp, err := provider.Chat(ctx, chatReq)
	if err != nil {
		return nil, err
	}

	return &HumanizeResponse{
		Text:      resp.Content,
		TokensIn:  resp.Usage.PromptTokens,
		TokensOut: resp.Usage.CompletionTokens,
		Provider:  resp.Provider,
	}, nil
}

func (e *Engine) HumanizeStream(ctx context.Context, req HumanizeRequest, w io.Writer) error {
	if req.Mode == "" {
		req.Mode = "standard"
	}
	if req.Tone == "" {
		req.Tone = "neutral"
	}

	mode := resolveMode(req.Mode)
	promptKey := "humanize-" + mode + ".md"
	p, err := prompts.Get(promptKey)
	if err != nil {
		return err
	}

	provider, err := e.selectProvider(mode)
	if err != nil {
		return fmt.Errorf("no provider available: %w", err)
	}

	userPrompt := buildUser(req, p.GetTpl())

	chatReq := ai.ChatRequest{
		SystemPrompt: p.GetSystem(),
		Messages: []ai.Message{
			{Role: "user", Content: userPrompt},
		},
		Temperature: modeToTemperature(mode),
		MaxTokens:   8192,
	}

	ch, err := provider.ChatStream(ctx, chatReq)
	if err != nil {
		return err
	}

	flusher, canFlush := w.(interface{ Flush() })

	for chunk := range ch {
		if chunk.Error != nil {
			return chunk.Error
		}
		if chunk.Done {
			_, err = fmt.Fprintf(w, "data: [DONE]\n\n")
			if canFlush {
				flusher.Flush()
			}
			return err
		}
		if chunk.Content != "" {
			// SSE-encode: escape newlines within a token
			token := strings.ReplaceAll(chunk.Content, "\n", "\\n")
			_, err = fmt.Fprintf(w, "data: %s\n\n", token)
			if err != nil {
				return err
			}
			if canFlush {
				flusher.Flush()
			}
		}
	}
	return nil
}

func (e *Engine) Detect(ctx context.Context, req DetectRequest) (*DetectResponse, error) {
	// Determine which prompt to use based on parameters
	promptKey := "detect-ai.md"
	if req.DocType != "" || req.Field != "" {
		promptKey = "detect-academic.md"
	}

	p, err := prompts.Get(promptKey)
	if err != nil {
		return heuristicDetect(req.Text), nil
	}

	provider, err := e.selectProvider("standard")
	if err != nil {
		return heuristicDetect(req.Text), nil
	}

	// Build user prompt with all parameters
	userPrompt := strings.ReplaceAll(p.GetTpl(), "{{.Text}}", req.Text)
	userPrompt = strings.ReplaceAll(userPrompt, "{{.DocType}}", req.DocType)
	userPrompt = strings.ReplaceAll(userPrompt, "{{.Field}}", req.Field)

	chatReq := ai.ChatRequest{
		SystemPrompt: p.GetSystem(),
		Messages: []ai.Message{
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.1,
		MaxTokens:   4096,
	}

	resp, err := provider.Chat(ctx, chatReq)
	if err != nil {
		return heuristicDetect(req.Text), nil
	}

	// Parse JSON response
	var result DetectResponse
	content := strings.TrimSpace(resp.Content)
	// Strip markdown code fences if present
	if strings.HasPrefix(content, "```") {
		lines := strings.Split(content, "\n")
		if len(lines) > 2 {
			content = strings.Join(lines[1:len(lines)-1], "\n")
		}
	}
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return heuristicDetect(req.Text), nil
	}

	// Copy from nested detection_result if top-level fields are zero
	if result.AIScore == 0 && result.DetectionResult.AIScore > 0 {
		result.AIScore = result.DetectionResult.AIScore
	}
	if result.Confidence == 0 && result.DetectionResult.ConfidenceLevel > 0 {
		result.Confidence = result.DetectionResult.ConfidenceLevel
	}
	if result.Label == "" && result.DetectionResult.Label != "" {
		result.Label = result.DetectionResult.Label
	}

	// Normalize
	if result.AIScore < 0 {
		result.AIScore = 0
	}
	if result.AIScore > 1 {
		result.AIScore = 1
	}
	result.HumanScore = 1.0 - result.AIScore
	if result.Label == "" {
		switch {
		case result.AIScore > 0.7:
			result.Label = "ai"
		case result.AIScore < 0.3:
			result.Label = "human"
		default:
			result.Label = "mixed"
		}
	}

	return &result, nil
}

func heuristicDetect(text string) *DetectResponse {
	lower := strings.ToLower(text)
	aiWords := []string{
		"utilize", "implement", "facilitate", "leverage", "comprehensive",
		"delve", "nuanced", "paramount", "intricate", "commendable",
		"pivotal", "robust", "seamlessly", "streamline", "furthermore",
		"in conclusion", "in summary", "it is worth noting", "it is important to note",
	}
	score := 0
	for _, w := range aiWords {
		if strings.Contains(lower, w) {
			score++
		}
	}
	aiScore := float64(score) / float64(len(aiWords))
	if aiScore > 1 {
		aiScore = 1
	}
	label := "mixed"
	if aiScore > 0.7 {
		label = "ai"
	} else if aiScore < 0.25 {
		label = "human"
	}
	return &DetectResponse{
		AIScore:    aiScore,
		HumanScore: 1.0 - aiScore,
		Confidence: 0.5,
		Label:      label,
	}
}

// PlagiarismCheck performs plagiarism and AI content detection on the text.
func (e *Engine) PlagiarismCheck(ctx context.Context, req PlagiarismRequest) (*PlagiarismResponse, error) {
	p, err := prompts.Get("plagiarism-check.md")
	if err != nil {
		return heuristicPlagiarismCheck(req.Text), nil
	}

	provider, err := e.selectProvider("standard")
	if err != nil {
		return heuristicPlagiarismCheck(req.Text), nil
	}

	// Build user prompt with all parameters
	userPrompt := strings.ReplaceAll(p.GetTpl(), "{{.Text}}", req.Text)
	userPrompt = strings.ReplaceAll(userPrompt, "{{.Language}}", req.Language)

	chatReq := ai.ChatRequest{
		SystemPrompt: p.GetSystem(),
		Messages: []ai.Message{
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.1,
		MaxTokens:   4096,
	}

	resp, err := provider.Chat(ctx, chatReq)
	if err != nil {
		return heuristicPlagiarismCheck(req.Text), nil
	}

	// Parse JSON response
	var result PlagiarismResponse
	content := strings.TrimSpace(resp.Content)
	// Strip markdown code fences if present
	if strings.HasPrefix(content, "```") {
		lines := strings.Split(content, "\n")
		if len(lines) > 2 {
			content = strings.Join(lines[1:len(lines)-1], "\n")
		}
	}
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return heuristicPlagiarismCheck(req.Text), nil
	}

	// Normalize scores
	if result.PlagiarismScore < 0 {
		result.PlagiarismScore = 0
	}
	if result.PlagiarismScore > 100 {
		result.PlagiarismScore = 100
	}
	if result.AIScore < 0 {
		result.AIScore = 0
	}
	if result.AIScore > 100 {
		result.AIScore = 100
	}

	result.WordCount = CountWords(req.Text)

	// Set verdict if empty
	if result.Verdict == "" {
		if result.PlagiarismScore < 15 {
			result.Verdict = "original"
		} else if result.PlagiarismScore > 50 {
			result.Verdict = "plagiarized"
		} else {
			result.Verdict = "mixed"
		}
	}

	return &result, nil
}

// heuristicPlagiarismCheck provides a fallback when AI engine is not available.
func heuristicPlagiarismCheck(text string) *PlagiarismResponse {
	lower := strings.ToLower(text)

	// Check for common AI/plagiarism indicators
	plagiarismIndicators := []string{
		"according to", "as stated by", "it is widely known", "research shows",
		"studies have shown", "experts say", "many people believe", "it is generally accepted",
		"in today's society", "throughout history", "since the beginning of time",
		"it goes without saying", "needless to say", "in this day and age",
	}

	plagiarismScore := 0
	for _, phrase := range plagiarismIndicators {
		if strings.Contains(lower, phrase) {
			plagiarismScore += 8
		}
	}

	// AI content indicators
	aiIndicators := []string{
		"utilize", "implement", "facilitate", "leverage", "comprehensive",
		"delve", "nuanced", "paramount", "intricate", "seamlessly",
		"furthermore", "in conclusion", "it is important to note",
	}

	aiScore := 0
	for _, w := range aiIndicators {
		if strings.Contains(lower, w) {
			aiScore += 7
		}
	}

	// Cap scores at 100
	if plagiarismScore > 100 {
		plagiarismScore = 100
	}
	if aiScore > 100 {
		aiScore = 100
	}

	verdict := "original"
	if plagiarismScore > 50 || aiScore > 50 {
		verdict = "plagiarized"
	} else if plagiarismScore > 20 || aiScore > 20 {
		verdict = "mixed"
	}

	// Split into sentences for analysis
	sentences := splitIntoSentences(text)
	sentenceResults := make([]PlagiarismSentence, 0, len(sentences))
	for _, s := range sentences {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		sLower := strings.ToLower(s)
		sType := "original"
		similarity := 0.0

		for _, phrase := range plagiarismIndicators {
			if strings.Contains(sLower, phrase) {
				sType = "plagiarized"
				similarity = 0.7
				break
			}
		}
		if sType == "original" {
			for _, w := range aiIndicators {
				if strings.Contains(sLower, w) {
					sType = "ai"
					similarity = 0.6
					break
				}
			}
		}

		sentenceResults = append(sentenceResults, PlagiarismSentence{
			Text:       s,
			Type:       sType,
			Similarity: similarity,
		})
	}

	return &PlagiarismResponse{
		PlagiarismScore: plagiarismScore,
		AIScore:         aiScore,
		Verdict:         verdict,
		Sentences:       sentenceResults,
		MatchedSources:  []PlagiarismMatchedSource{},
		Recommendations: []string{
			"Review highlighted sections for proper attribution",
			"Add citations where source material is referenced",
		},
		WordCount: CountWords(text),
	}
}

// splitIntoSentences splits text into sentences.
func splitIntoSentences(text string) []string {
	replaced := strings.ReplaceAll(text, ". ", ".\x00")
	replaced = strings.ReplaceAll(replaced, "! ", "!\x00")
	replaced = strings.ReplaceAll(replaced, "? ", "?\x00")
	replaced = strings.ReplaceAll(replaced, ".\n", ".\x00")
	replaced = strings.ReplaceAll(replaced, "!\n", "!\x00")
	replaced = strings.ReplaceAll(replaced, "?\n", "?\x00")

	sentences := strings.Split(replaced, "\x00")
	result := make([]string, 0, len(sentences))
	for _, s := range sentences {
		s = strings.TrimSpace(s)
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}

func CountWords(text string) int {
	if strings.TrimSpace(text) == "" {
		return 0
	}
	cjk := 0
	for _, r := range text {
		if r >= 0x4E00 && r <= 0x9FFF {
			cjk++
		}
	}
	en := len(strings.Fields(strings.Map(func(r rune) rune {
		if r >= 0x4E00 && r <= 0x9FFF {
			return ' '
		}
		return r
	}, text)))
	return cjk + en
}

func buildUser(req HumanizeRequest, tpl string) string {
	r := tpl
	r = strings.ReplaceAll(r, "{{.Text}}", req.Text)
	r = strings.ReplaceAll(r, "{{.Tone}}", req.Tone)

	// DocType - direct replacement
	r = strings.ReplaceAll(r, "{{.DocType}}", req.DocType)

	// Style - direct replacement
	r = strings.ReplaceAll(r, "{{.Style}}", req.Style)

	// Purpose - direct replacement (for templates that use {{.Purpose}} directly)
	r = strings.ReplaceAll(r, "{{.Purpose}}", req.Purpose)

	// Keywords - join SEO keywords for templates that use {{.Keywords}}
	if len(req.SEOKeywords) > 0 {
		r = strings.ReplaceAll(r, "{{.Keywords}}", strings.Join(req.SEOKeywords, ", "))
	} else {
		r = strings.ReplaceAll(r, "{{.Keywords}}", "")
	}

	// Individual note placeholders (each gets only its specific instruction)
	var preserveNote, intensityNote, dialectNote, frozenNote, seoNote, purposeNote, customStyleNote string

	// PreserveFormatNote
	if req.PreserveFormat {
		preserveNote = "Preserve all original formatting including paragraphs, bullet points, and headings."
	}
	r = strings.ReplaceAll(r, "{{.PreserveFormatNote}}", preserveNote)

	// IntensityNote - based on strength (1-5)
	if req.Strength > 0 {
		switch req.Strength {
		case 1:
			intensityNote = "Apply minimal changes - only light polishing while keeping the original structure and wording as close as possible."
		case 2:
			intensityNote = "Apply light rewriting - adjust sentence rhythm and minor word choices, preserve most of the original."
		case 3:
			intensityNote = "Apply standard rewriting - restructure sentences and replace some expressions while maintaining meaning."
		case 4:
			intensityNote = "Apply deep rewriting - significantly restructure and rephrase to sound more natural."
		case 5:
			intensityNote = "Apply maximum rewriting - completely transform the text with varied sentence structures and authentic vocabulary."
		}
	}
	r = strings.ReplaceAll(r, "{{.IntensityNote}}", intensityNote)

	// DialectNote - applies when dialect is specified (assumes English text)
	if req.Dialect != "" {
		switch req.Dialect {
		case "us":
			dialectNote = "Use American English spelling and vocabulary (e.g., color, organize, apartment)."
		case "uk":
			dialectNote = "Use British English spelling and vocabulary (e.g., colour, organise, flat)."
		case "au":
			dialectNote = "Use Australian English spelling and expressions."
		case "ca":
			dialectNote = "Use Canadian English spelling (mixed British/American conventions)."
		}
	}
	r = strings.ReplaceAll(r, "{{.DialectNote}}", dialectNote)

	// FrozenKeywordsNote
	if len(req.FrozenKeywords) > 0 {
		keywords := strings.Join(req.FrozenKeywords, "\", \"")
		frozenNote = fmt.Sprintf("IMPORTANT: You MUST preserve these exact words/phrases unchanged: \"%s\". Do not modify, paraphrase, or replace them.", keywords)
	}
	r = strings.ReplaceAll(r, "{{.FrozenKeywordsNote}}", frozenNote)

	// SEOKeywordsNote
	if len(req.SEOKeywords) > 0 {
		keywords := strings.Join(req.SEOKeywords, "\", \"")
		seoNote = fmt.Sprintf("Maintain keyword density for these SEO terms: \"%s\". Preserve them naturally throughout the text.", keywords)
	}
	r = strings.ReplaceAll(r, "{{.SEOKeywordsNote}}", seoNote)

	// PurposeNote - purpose-specific instructions
	if req.Purpose != "" {
		switch req.Purpose {
		case "seo":
			purposeNote = "Optimize for SEO while maintaining natural flow. Preserve all important keywords and their density."
		case "academic":
			purposeNote = "Maintain academic tone with proper citations and formal structure."
		case "marketing":
			purposeNote = "Write persuasively with engaging calls-to-action and benefit-focused language."
		case "business":
			purposeNote = "Use professional business language with clear, concise communication."
		case "story":
			purposeNote = "Write with narrative flair, emotional depth, and engaging storytelling."
		case "journalist":
			purposeNote = "Write with journalistic precision - factual, objective, and news-style reporting."
		case "high_school":
			purposeNote = "Write at a high school level - clear, straightforward, with accessible vocabulary."
		case "university":
			purposeNote = "Write at a university level - scholarly, with proper academic conventions."
		}
	}
	r = strings.ReplaceAll(r, "{{.PurposeNote}}", purposeNote)

	// CustomStyleNote
	if len(req.CustomStyle) >= 200 {
		customStyleNote = fmt.Sprintf("IMPORTANT: Mimic the writing style from this sample text — match the vocabulary level, sentence rhythm, tone, and personality:\n\n--- STYLE SAMPLE START ---\n%s\n--- STYLE SAMPLE END ---\n\nApply this style to the rewritten output.", req.CustomStyle)
	}
	r = strings.ReplaceAll(r, "{{.CustomStyleNote}}", customStyleNote)

	// CombinedNotes - all notes combined for templates that want everything in one placeholder
	var allNotes []string
	if preserveNote != "" {
		allNotes = append(allNotes, preserveNote)
	}
	if intensityNote != "" {
		allNotes = append(allNotes, intensityNote)
	}
	if dialectNote != "" {
		allNotes = append(allNotes, dialectNote)
	}
	if frozenNote != "" {
		allNotes = append(allNotes, frozenNote)
	}
	if seoNote != "" {
		allNotes = append(allNotes, seoNote)
	}
	if purposeNote != "" {
		allNotes = append(allNotes, purposeNote)
	}
	if customStyleNote != "" {
		allNotes = append(allNotes, customStyleNote)
	}
	r = strings.ReplaceAll(r, "{{.CombinedNotes}}", strings.Join(allNotes, "\n\n"))

	return r
}
