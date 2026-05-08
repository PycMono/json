package image

// OCR provider abstraction — factory pattern, ready to add Tesseract / Google Vision etc.

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Provider Interface ───────────────────────────────────────────────────────

type OCRProvider interface {
	Name() string
	Recognize(imageBase64, mimeType, lang string) (*OCRResult, error)
}

type OCRResult struct {
	Text       string   `json:"text"`
	Lines      []string `json:"lines"`
	Confidence float64  `json:"confidence"`
	Provider   string   `json:"provider"`
}

// ─── OCR.space Provider ───────────────────────────────────────────────────────

type ocrSpaceProvider struct {
	apiKey string
	client *http.Client
}

func newOCRSpaceProvider(apiKey string) OCRProvider {
	return &ocrSpaceProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (p *ocrSpaceProvider) Name() string { return "ocr.space" }

type ocrSpaceResponse struct {
	ParsedResults []struct {
		ParsedText    string  `json:"ParsedText"`
		TextOverlay   any     `json:"TextOverlay"`
		MeanConfidence float64 `json:"MeanConfidence"`
	} `json:"ParsedResults"`
	IsErroredOnProcessing bool   `json:"IsErroredOnProcessing"`
	ErrorMessage          string `json:"ErrorMessage"`
}

func (p *ocrSpaceProvider) Recognize(imageBase64, mimeType, lang string) (*OCRResult, error) {
	// OCR.space needs the "data URI" format
	dataURI := fmt.Sprintf("data:%s;base64,%s", mimeType, imageBase64)

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)

	_ = w.WriteField("base64Image", dataURI)
	_ = w.WriteField("language", mapLangCode(lang))
	_ = w.WriteField("isOverlayRequired", "false")
	_ = w.WriteField("detectOrientation", "true")
	_ = w.WriteField("scale", "true")
	_ = w.WriteField("isTable", "false")
	_ = w.WriteField("OCREngine", "2") // Engine 2 = better accuracy
	w.Close()

	req, err := http.NewRequest("POST", "https://api.ocr.space/parse/image", &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", p.apiKey)
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ocr.space request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var ocrResp ocrSpaceResponse
	if err := json.Unmarshal(body, &ocrResp); err != nil {
		return nil, fmt.Errorf("ocr.space parse failed: %w", err)
	}
	if ocrResp.IsErroredOnProcessing {
		return nil, fmt.Errorf("ocr.space error: %s", ocrResp.ErrorMessage)
	}
	if len(ocrResp.ParsedResults) == 0 {
		return &OCRResult{Text: "", Lines: []string{}, Confidence: 0, Provider: p.Name()}, nil
	}

	parsed := ocrResp.ParsedResults[0]
	text := strings.TrimSpace(parsed.ParsedText)
	lines := []string{}
	if text != "" {
		for _, l := range strings.Split(text, "\r\n") {
			if t := strings.TrimSpace(l); t != "" {
				lines = append(lines, t)
			}
		}
	}

	return &OCRResult{
		Text:       text,
		Lines:      lines,
		Confidence: parsed.MeanConfidence,
		Provider:   p.Name(),
	}, nil
}

// mapLangCode maps ISO 639-1 to OCR.space language codes
func mapLangCode(lang string) string {
	m := map[string]string{
		"en": "eng", "zh": "chs", "ja": "jpn", "ko": "kor",
		"de": "ger", "fr": "fre", "es": "spa", "it": "ita",
		"pt": "por", "ru": "rus", "ar": "ara", "hi": "hin",
	}
	if v, ok := m[lang]; ok {
		return v
	}
	return "eng"
}

// ─── Factory ─────────────────────────────────────────────────────────────────

var ocrAPIKey string

// InitOCRService registers the OCR API key (called from router setup).
func InitOCRService(apiKey string) {
	ocrAPIKey = apiKey
}

func getOCRProvider() OCRProvider {
	// Factory: in the future, add Tesseract / Google Vision / Azure here
	return newOCRSpaceProvider(ocrAPIKey)
}

// ─── API Handler ─────────────────────────────────────────────────────────────

// ImgOCRAPI is the backend proxy endpoint POST /api/img/ocr
// It receives { image_base64, mime_type, lang } and returns extracted text.
// The OCR.space API key is never sent to the browser.
func ImgOCRAPI(c *gin.Context) {
	var req struct {
		ImageBase64 string `json:"image_base64" binding:"required"`
		MimeType    string `json:"mime_type"`
		Lang        string `json:"lang"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing image_base64"})
		return
	}
	if req.MimeType == "" {
		req.MimeType = "image/jpeg"
	}
	if req.Lang == "" {
		req.Lang = "eng"
	}

	provider := getOCRProvider()
	result, err := provider.Recognize(req.ImageBase64, req.MimeType, req.Lang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"text":       result.Text,
		"lines":      result.Lines,
		"confidence": result.Confidence,
		"provider":   result.Provider,
	})
}

