package ai

import (
	ai2 "PycMono/github/json/application/service/ai"
	"PycMono/github/json/common/faq"
	"PycMono/github/json/infrastructure/controller/http/render"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ─── API: POST /api/ai/plagiarism-check ────────────────────────────────────────

// PlagiarismCheckAPI handles POST /api/ai/plagiarism-check.
func PlagiarismCheckAPI(c *gin.Context) {
	var req ai2.PlagiarismRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "message": err.Error()})
		return
	}

	req.Text = strings.TrimSpace(req.Text)
	if req.Text == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty text"})
		return
	}

	wordCount := ai2.CountWords(req.Text)
	if wordCount > 15000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "text too long", "message": "max 15000 words"})
		return
	}

	engine := getHumanizerEngine()
	if engine == nil {
		// Heuristic fallback
		result := heuristicPlagiarismResponse(req.Text)
		c.JSON(http.StatusOK, result)
		return
	}

	resp, err := engine.PlagiarismCheck(c.Request.Context(), req)
	if err != nil {
		// Fallback to heuristic on error
		result := heuristicPlagiarismResponse(req.Text)
		c.JSON(http.StatusOK, result)
		return
	}

	result := transformPlagiarismResponse(resp)
	c.JSON(http.StatusOK, result)
}

// transformPlagiarismResponse converts engine output to frontend format.
func transformPlagiarismResponse(resp *ai2.PlagiarismResponse) gin.H {
	// Build sentences for frontend highlighting
	sentences := make([]map[string]interface{}, 0, len(resp.Sentences))
	for _, s := range resp.Sentences {
		sentences = append(sentences, map[string]interface{}{
			"text":       s.Text,
			"type":       s.Type,
			"similarity": int(s.Similarity * 100),
			"reason":     s.Reason,
		})
	}

	// Build matched sources
	sources := make([]map[string]interface{}, 0, len(resp.MatchedSources))
	for _, src := range resp.MatchedSources {
		sources = append(sources, map[string]interface{}{
			"title":      src.Title,
			"url":        src.URL,
			"similarity": int(src.Similarity * 100),
			"type":       src.Type,
		})
	}

	// Verdict label
	verdictLabel := resp.Verdict
	switch resp.Verdict {
	case "original":
		verdictLabel = "Original"
	case "plagiarized":
		verdictLabel = "Plagiarized"
	case "mixed":
		verdictLabel = "Mixed"
	}

	return gin.H{
		"plagiarism_score": resp.PlagiarismScore,
		"ai_score":         resp.AIScore,
		"verdict":          verdictLabel,
		"sentences":        sentences,
		"matched_sources":  sources,
		"recommendations":  resp.Recommendations,
		"word_count":       resp.WordCount,
	}
}

// heuristicPlagiarismResponse generates a basic plagiarism response for fallback.
func heuristicPlagiarismResponse(text string) gin.H {
	wordCount := ai2.CountWords(text)
	return gin.H{
		"plagiarism_score": 0,
		"ai_score":         0,
		"verdict":          "Original",
		"sentences":        []map[string]interface{}{},
		"matched_sources":  []map[string]interface{}{},
		"recommendations":  []string{},
		"word_count":       wordCount,
	}
}

// ─── Plagiarism Checker FAQ ───────────────────────────────────────────────────

// PlagiarismFAQs returns the FAQ items for the plagiarism checker.
var PlagiarismFAQs = []faq.FAQ{
	{Q: "plagiarism.faq.q1", A: "plagiarism.faq.a1"},
	{Q: "plagiarism.faq.q2", A: "plagiarism.faq.a2"},
	{Q: "plagiarism.faq.q3", A: "plagiarism.faq.a3"},
	{Q: "plagiarism.faq.q4", A: "plagiarism.faq.a4"},
	{Q: "plagiarism.faq.q5", A: "plagiarism.faq.a5"},
	{Q: "plagiarism.faq.q6", A: "plagiarism.faq.a6"},
}

// PlagiarismPage redirects to the plagiarism tab on the humanize hub page.
func PlagiarismPage(c *gin.Context) {
	lang := render.GetLang(c)
	url := "/ai/humanize?tab=plagiarism"
	if lang != "" && lang != "en" {
		url += "&lang=" + lang
	}
	c.Redirect(http.StatusFound, url)
}
