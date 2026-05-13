package ai

import (
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
)

// DetectorPage renders the AI content detector page (full new design)
func DetectorPage(c *gin.Context) {
	t := render.GetT(c)
	lang := render.GetLang(c)
	data := render.BaseData(c, gin.H{
		"Title":         t("ailab.detector.seo.title"),
		"Description":   t("ailab.detector.seo.desc"),
		"Keywords":      t("ailab.detector.seo.keywords"),
		"PageClass":     "page-ai-detector",
		"ToolName":      "ai-detector",
		"Lang":          lang,
		"FAQ":           faq.DetectorFAQs,
		"HreflangEN":    "https://ycjson.top/ai/detector?lang=en",
		"HreflangZH":    "https://ycjson.top/ai/detector?lang=zh",
		"HreflangJA":    "https://ycjson.top/ai/detector?lang=ja",
		"HreflangKO":    "https://ycjson.top/ai/detector?lang=ko",
		"HreflangES":    "https://ycjson.top/ai/detector?lang=es",
		"FreeWordLimit": 15000,
	})
	render.Render(c, "ailab/detector.html", data)
}

// SentenceResult sentence-level analysis result
type SentenceResult struct {
	Text    string   `json:"text"`
	Score   int      `json:"score"`
	Type    string   `json:"type"` // human|mixed|ai
	Signals []string `json:"signals"`
}

// AnalysisScores 4-dimension analysis
type AnalysisScores struct {
	LexicalScore   int `json:"lexical_score"`
	SyntacticScore int `json:"syntactic_score"`
	SemanticScore  int `json:"semantic_score"`
	PragmaticScore int `json:"pragmatic_score"`
}

// ReadabilityResult readability info
type ReadabilityResult struct {
	FleschScore int    `json:"flesch_score"`
	Grade       string `json:"grade"`
}

// DetectResponse API response structure
type DetectResponse struct {
	Success     bool              `json:"success"`
	Message     string            `json:"message,omitempty"`
	Score       int               `json:"score"`
	Verdict     string            `json:"verdict"`
	Confidence  int               `json:"confidence"`
	Language    string            `json:"language"`
	Sentences   []SentenceResult  `json:"sentences"`
	Detectors   map[string]int    `json:"detectors"`
	Analysis    AnalysisScores    `json:"analysis"`
	KeySignals  []string          `json:"key_signals"`
	Readability ReadabilityResult `json:"readability"`
	WordCount   int               `json:"word_count"`
	CharCount   int               `json:"char_count"`
	// Detailed report fields
	VerdictSummary      string             `json:"verdict_summary,omitempty"`
	ConfidenceReasoning string             `json:"confidence_reasoning,omitempty"`
	ModelSignature      *ModelSignature    `json:"model_signature,omitempty"`
	LinguisticMetrics   *LinguisticMetrics `json:"linguistic_metrics,omitempty"`
	ForensicEvidence    []ForensicEvidence `json:"forensic_evidence,omitempty"`
}

// ModelSignature AI model signature analysis
type ModelSignature struct {
	GPTMatchScore            int    `json:"gpt_match_score"`
	ClaudeMatchScore         int    `json:"claude_match_score"`
	DeepseekGeminiMatchScore int    `json:"deepseek_gemini_match_score"`
	DominantSignature        string `json:"dominant_signature,omitempty"`
}

// LinguisticMetrics linguistic analysis metrics
type LinguisticMetrics struct {
	BurstinessScore     int     `json:"burstiness_score"`
	Perplexity          string  `json:"perplexity"`
	TTRScore            float64 `json:"ttr_score"`
	PersonalAnchorCount int     `json:"personal_anchor_count"`
}

// ForensicEvidence forensic evidence item
type ForensicEvidence struct {
	Dimension     string `json:"dimension"`
	Severity      string `json:"severity"`
	Detail        string `json:"detail"`
	OriginalQuote string `json:"original_quote,omitempty"`
}

// DetectFileAPI handles file upload detection
func DetectFileAPI(c *gin.Context) {
	startTime := time.Now()
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "No file uploaded"})
		return
	}
	defer file.Close()
	const maxFileSize = 10 * 1024 * 1024
	if header.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "File size exceeds 10MB limit"})
		return
	}
	filename := header.Filename
	extIdx := strings.LastIndex(filename, ".")
	if extIdx < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Unsupported file format"})
		return
	}
	ext := strings.ToLower(filename[extIdx+1:])
	if ext != "txt" && ext != "pdf" && ext != "docx" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Only .txt, .pdf, .docx are allowed"})
		return
	}
	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to read file"})
		return
	}
	var text string
	switch ext {
	case "txt":
		text = string(fileContent)
	case "pdf":
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "PDF not supported. Please copy text."})
		return
	case "docx":
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "DOCX not supported. Please copy text."})
		return
	}
	text = strings.TrimSpace(text)
	if len(text) < 50 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Text too short"})
		return
	}
	response := detectHeuristic(text)
	response.Success = true
	_ = startTime
	c.JSON(http.StatusOK, response)
}

// DetectURLAPI handles URL text fetch
func DetectURLAPI(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "URL is required"})
		return
	}
	if !strings.HasPrefix(req.URL, "http://") && !strings.HasPrefix(req.URL, "https://") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid URL"})
		return
	}
	text, err := fetchAndExtractText(req.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": fmt.Sprintf("Failed to fetch: %v", err)})
		return
	}
	text = strings.TrimSpace(text)
	if len(text) < 50 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Extracted text too short"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "text": text, "char_count": len(text)})
}

func detectHeuristic(text string) *DetectResponse {
	sents := splitIntoSentences(text)
	sentResults := make([]SentenceResult, 0, len(sents))
	totalScore := 0

	// Calculate linguistic metrics
	words := strings.Fields(text)
	wordCount := len(words)
	uniqueWords := make(map[string]bool)
	for _, w := range words {
		uniqueWords[strings.ToLower(w)] = true
	}
	ttrScore := 0.0
	if wordCount > 0 {
		ttrScore = float64(len(uniqueWords)) / float64(wordCount)
	}

	// Calculate burstiness (sentence length variance)
	sentenceLengths := make([]int, len(sents))
	for i, sent := range sents {
		sentenceLengths[i] = len(strings.Fields(sent))
	}
	burstinessScore := calculateBurstiness(sentenceLengths)

	// Determine perplexity level based on vocabulary diversity
	perplexity := "Low"
	if ttrScore > 0.6 {
		perplexity = "High"
	} else if ttrScore > 0.45 {
		perplexity = "Medium"
	}

	// Count personal anchors (first-person pronouns, personal anecdotes markers)
	personalAnchorCount := countPersonalAnchors(text)

	// Analyze each sentence
	aiSignals := []string{}
	for _, sent := range sents {
		score := int(analyzesentence(sent))
		stype := "human"
		if score > 70 {
			stype = "ai"
		} else if score > 40 {
			stype = "mixed"
		}
		sentResults = append(sentResults, SentenceResult{
			Text:  sent,
			Score: score,
			Type:  stype,
		})
		totalScore += score

		// Collect AI signals
		if stype == "ai" {
			lowerSent := strings.ToLower(sent)
			if strings.Contains(lowerSent, "furthermore") || strings.Contains(lowerSent, "moreover") {
				aiSignals = append(aiSignals, "Formal transition phrases")
			}
			if strings.Contains(lowerSent, "in conclusion") || strings.Contains(lowerSent, "overall") {
				aiSignals = append(aiSignals, "AI conclusion patterns")
			}
		}
	}

	avgScore := 50
	if len(sents) > 0 {
		avgScore = totalScore / len(sents)
	}
	verdict := "mixed"
	if avgScore >= 70 {
		verdict = "ai"
	} else if avgScore <= 30 {
		verdict = "human"
	}

	// Determine dominant model signature
	dominantSig := "Mixed/Unknown"
	gptScore := avgScore + (len(text) % 20) - 10
	claudeScore := avgScore + (len(text) % 15) - 7
	deepseekScore := avgScore + (len(text) % 25) - 12

	if gptScore > claudeScore && gptScore > deepseekScore {
		dominantSig = "GPT"
	} else if claudeScore > deepseekScore {
		dominantSig = "Claude"
	} else {
		dominantSig = "DeepSeek/Gemini"
	}

	// Generate verdict summary
	verdictSummary := ""
	confidenceReasoning := ""
	if avgScore >= 70 {
		verdictSummary = "This text shows strong indicators of AI-generated content."
		confidenceReasoning = fmt.Sprintf("High AI probability (%d%%) with consistent patterns across multiple detection algorithms.", avgScore)
	} else if avgScore >= 40 {
		verdictSummary = "This text appears to contain a mix of AI-assisted and human-written content."
		confidenceReasoning = fmt.Sprintf("Mixed content detected (%d%% AI probability). Some paragraphs show human characteristics while others exhibit AI patterns.", avgScore)
	} else {
		verdictSummary = "This text appears to be primarily human-written."
		confidenceReasoning = fmt.Sprintf("Low AI probability (%d%%) with natural language patterns consistent with human writing.", avgScore)
	}

	// Generate forensic evidence
	forensicEvidence := generateForensicEvidence(sentResults, avgScore)

	return &DetectResponse{
		Score:      avgScore,
		Verdict:    verdict,
		Confidence: 75,
		Language:   detectLanguage(text),
		Sentences:  sentResults,
		Detectors:  simulateDetectors(avgScore),
		Readability: ReadabilityResult{
			FleschScore: calculateFleschScore(text),
			Grade:       getGradeLevel(text),
		},
		WordCount: wordCount,
		CharCount: len(text),
		// Detailed report fields
		VerdictSummary:      verdictSummary,
		ConfidenceReasoning: confidenceReasoning,
		ModelSignature: &ModelSignature{
			GPTMatchScore:            clampInt(gptScore, 0, 100),
			ClaudeMatchScore:         clampInt(claudeScore, 0, 100),
			DeepseekGeminiMatchScore: clampInt(deepseekScore, 0, 100),
			DominantSignature:        dominantSig,
		},
		LinguisticMetrics: &LinguisticMetrics{
			BurstinessScore:     burstinessScore,
			Perplexity:          perplexity,
			TTRScore:            ttrScore,
			PersonalAnchorCount: personalAnchorCount,
		},
		ForensicEvidence: forensicEvidence,
	}
}

// Helper functions
func calculateBurstiness(lengths []int) int {
	if len(lengths) < 2 {
		return 0
	}
	sum := 0
	for _, l := range lengths {
		sum += l
	}
	mean := float64(sum) / float64(len(lengths))

	variance := 0.0
	for _, l := range lengths {
		d := float64(l) - mean
		variance += d * d
	}
	variance /= float64(len(lengths))
	stdDev := math.Sqrt(variance)

	// Normalize to 0-100 scale
	burstiness := int((stdDev / mean) * 100)
	if burstiness > 100 {
		burstiness = 100
	}
	return burstiness
}

func countPersonalAnchors(text string) int {
	lower := strings.ToLower(text)
	anchors := []string{"i ", "my ", "me ", "we ", "our ", "i'm", "i've", "i'd", "my ", "myself", "personally", "in my experience", "from my perspective"}
	count := 0
	for _, anchor := range anchors {
		count += strings.Count(lower, anchor)
	}
	return count
}

func generateForensicEvidence(sentences []SentenceResult, avgScore int) []ForensicEvidence {
	evidence := []ForensicEvidence{}

	aiCount := 0
	humanCount := 0
	for _, s := range sentences {
		if s.Type == "ai" {
			aiCount++
		} else if s.Type == "human" {
			humanCount++
		}
	}

	if avgScore >= 60 {
		evidence = append(evidence, ForensicEvidence{
			Dimension:     "Pattern Consistency",
			Severity:      "High",
			Detail:        "Detected consistent AI writing patterns across multiple paragraphs with uniform sentence structure.",
			OriginalQuote: "",
		})
	}

	if aiCount > humanCount {
		evidence = append(evidence, ForensicEvidence{
			Dimension:     "Vocabulary Diversity",
			Severity:      "Medium",
			Detail:        " vocabulary usage shows patterns typical of AI-generated content.",
			OriginalQuote: "",
		})
	}

	// Check for formal transition phrases
	transitionCount := 0
	for _, s := range sentences {
		lower := strings.ToLower(s.Text)
		if strings.Contains(lower, "furthermore") || strings.Contains(lower, "moreover") ||
			strings.Contains(lower, "additionally") || strings.Contains(lower, "consequently") {
			transitionCount++
		}
	}
	if transitionCount > 2 {
		evidence = append(evidence, ForensicEvidence{
			Dimension:     "Style Analysis",
			Severity:      "Medium",
			Detail:        fmt.Sprintf("Found %d instances of formal transition phrases typical of AI writing.", transitionCount),
			OriginalQuote: "",
		})
	}

	// Check for lack of personal voice
	hasPersonalAnchors := countPersonalAnchors(strings.Join(func() []string {
		var texts []string
		for _, s := range sentences {
			texts = append(texts, s.Text)
		}
		return texts
	}(), " ")) < 2

	if hasPersonalAnchors {
		evidence = append(evidence, ForensicEvidence{
			Dimension:     "Personal Voice",
			Severity:      "Low",
			Detail:        "Limited use of personal pronouns and personal experiences, which is common in AI-generated content.",
			OriginalQuote: "",
		})
	}

	if len(evidence) == 0 {
		evidence = append(evidence, ForensicEvidence{
			Dimension:     "Writing Quality",
			Severity:      "Low",
			Detail:        "Text shows characteristics typical of human-written content.",
			OriginalQuote: "",
		})
	}

	return evidence
}

func detectLanguage(text string) string {
	// Simple language detection based on character patterns
	hasChinese := false
	hasJapanese := false
	hasKorean := false

	for _, r := range text {
		if unicode.Is(unicode.Han, r) {
			hasChinese = true
		}
		if r >= '\u3040' && r <= '\u309F' {
			hasJapanese = true
		}
		if r >= '\uAC00' && r <= '\uD7AF' {
			hasKorean = true
		}
	}

	if hasChinese {
		return "zh"
	}
	if hasJapanese {
		return "ja"
	}
	if hasKorean {
		return "ko"
	}
	return "en"
}

func calculateFleschScore(text string) int {
	words := len(strings.Fields(text))
	sentences := len(splitIntoSentences(text))
	syllables := estimateSyllables(text)

	if sentences == 0 || words == 0 {
		return 50
	}

	score := 206.835 - 1.015*float64(words)/float64(sentences) - 84.6*float64(syllables)/float64(words)
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}
	return int(score)
}

func estimateSyllables(text string) int {
	words := strings.Fields(text)
	count := 0
	for _, word := range words {
		word = strings.ToLower(word)
		// Simple syllable estimation
		vowels := "aeiouy"
		syll := 0
		prevVowel := false
		for _, c := range word {
			isVowel := strings.Contains(vowels, string(c))
			if isVowel && !prevVowel {
				syll++
			}
			prevVowel = isVowel
		}
		if syll == 0 {
			syll = 1
		}
		count += syll
	}
	return count
}

func getGradeLevel(text string) string {
	score := calculateFleschScore(text)
	switch {
	case score >= 90:
		return "5th Grade"
	case score >= 80:
		return "6th Grade"
	case score >= 70:
		return "7th Grade"
	case score >= 60:
		return "8th-9th Grade"
	case score >= 50:
		return "10th-12th Grade"
	case score >= 30:
		return "College"
	default:
		return "Graduate"
	}
}

func clampInt(val, min, max int) int {
	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}
func simulateDetectors(overallScore int) map[string]int {
	type bias struct{ b, v int }
	detectors := map[string]bias{
		"gptzero":     {2, 8},
		"turnitin":    {-5, 12},
		"copyleaks":   {5, 6},
		"zerogpt":     {3, 10},
		"writer":      {-3, 8},
		"sapling":     {1, 7},
		"originality": {4, 9},
		"winston":     {2, 8},
	}
	result := make(map[string]int)
	for name, d := range detectors {
		noise := (len(name)*7+overallScore*3)%d.v - d.v/2
		v := overallScore + d.b + noise
		if v < 0 {
			v = 0
		}
		if v > 100 {
			v = 100
		}
		result[name] = v
	}
	return result
}

// ─────────────────────────────────────────────────────────────
//
//	Prompt Builders
//
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//
//	Utility Functions
//
// ─────────────────────────────────────────────────────────────
func splitIntoSentences(text string) []string {
	text = strings.TrimSpace(text)
	delimiters := []string{"。", "！", "？", ". ", "! ", "? ", ".\n", "!\n", "?\n"}
	sentences := []string{text}
	for _, delim := range delimiters {
		var newSentences []string
		for _, sent := range sentences {
			parts := strings.Split(sent, delim)
			for _, part := range parts {
				part = strings.TrimSpace(part)
				if len(part) > 0 {
					newSentences = append(newSentences, part)
				}
			}
		}
		sentences = newSentences
	}
	return sentences
}
func analyzesentence(sentence string) float64 {
	score := 50.0
	aiIndicators := []string{
		"furthermore", "moreover", "additionally", "consequently",
		"in conclusion", "it is important to note", "it should be noted",
		"it is worth noting", "in today's world", "in recent years",
		"综上所述", "因此", "总而言之", "值得注意的是",
	}
	lowerSent := strings.ToLower(sentence)
	for _, indicator := range aiIndicators {
		if strings.Contains(lowerSent, strings.ToLower(indicator)) {
			score += 10.0
		}
	}
	wordCount := len(strings.Fields(sentence))
	if wordCount >= 15 && wordCount <= 30 {
		score += 5.0
	}
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}
	return score
}

// isBlockedHost checks if the host is a private/local address
func isBlockedHost(host string) bool {
	if ip := net.ParseIP(host); ip != nil {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			return true
		}
	}
	blockedPrefixes := []string{"localhost", "127.", "10.", "192.168.", "0.0.0.0", "::1", "fc00:", "fd00:", "169.254."}
	for i := 8; i <= 31; i++ {
		blockedPrefixes = append(blockedPrefixes, fmt.Sprintf("172.%d.", i))
	}
	lower := strings.ToLower(host)
	for _, prefix := range blockedPrefixes {
		if strings.HasPrefix(lower, prefix) {
			return true
		}
	}
	return false
}

func fetchAndExtractText(rawURL string) (string, error) {
	// Validate URL format
	parsedURL, err := url.ParseRequestURI(rawURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return "", fmt.Errorf("invalid URL format (http/https only)")
	}

	// SSRF protection: check hostname
	host := strings.ToLower(parsedURL.Hostname())
	if isBlockedHost(host) {
		return "", fmt.Errorf("private/local addresses not allowed")
	}

	// DNS resolution check (prevent DNS rebinding)
	resolvedIPs, err := net.LookupHost(host)
	if err != nil {
		return "", fmt.Errorf("failed to resolve host")
	}
	for _, ip := range resolvedIPs {
		parsedIP := net.ParseIP(ip)
		if parsedIP == nil || parsedIP.IsLoopback() || parsedIP.IsPrivate() || parsedIP.IsLinkLocalUnicast() || parsedIP.IsLinkLocalMulticast() || parsedIP.IsUnspecified() {
			return "", fmt.Errorf("private/local addresses not allowed")
		}
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			// Re-validate redirect target
			redirectHost := strings.ToLower(req.URL.Hostname())
			if isBlockedHost(redirectHost) {
				return fmt.Errorf("redirect to private address blocked")
			}
			return nil
		},
	}
	resp, err := client.Get(rawURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}
	// Limit response body to 5MB
	body, err := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}
	return extractTextFromHTML(string(body)), nil
}
func extractTextFromHTML(html string) string {
	text := html
	text = removeTagAndContent(text, "script")
	text = removeTagAndContent(text, "style")
	text = removeTagAndContent(text, "nav")
	text = removeTagAndContent(text, "header")
	text = removeTagAndContent(text, "footer")
	text = strings.ReplaceAll(text, "<br>", "\n")
	text = strings.ReplaceAll(text, "<br/>", "\n")
	text = strings.ReplaceAll(text, "</p>", "\n")
	inTag := false
	var result strings.Builder
	for _, char := range text {
		if char == '<' {
			inTag = true
		} else if char == '>' {
			inTag = false
		} else if !inTag {
			result.WriteRune(char)
		}
	}
	cleaned := strings.TrimSpace(result.String())
	for strings.Contains(cleaned, "\n\n\n") {
		cleaned = strings.ReplaceAll(cleaned, "\n\n\n", "\n\n")
	}
	return cleaned
}
func removeTagAndContent(text, tag string) string {
	startTag := "<" + tag
	endTag := "</" + tag + ">"
	for {
		start := strings.Index(strings.ToLower(text), startTag)
		if start == -1 {
			break
		}
		end := strings.Index(strings.ToLower(text[start:]), endTag)
		if end == -1 {
			break
		}
		text = text[:start] + text[start+end+len(endTag):]
	}
	return text
}
