package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	logsdk "github.com/PycMono/go-logger-sdk"
)

// ResendSender 使用 Resend API (https://resend.com) 发送邮件
// 也兼容其他支持相同 API 格式的服务
type ResendSender struct {
	apiKey     string
	fromEmail  string
	httpClient *http.Client
}

func NewResendSender(apiKey, fromEmail string) *ResendSender {
	return &ResendSender{
		apiKey:    apiKey,
		fromEmail: fromEmail,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Html    string   `json:"html"`
}

type resendResponse struct {
	ID    string `json:"id"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (s *ResendSender) SendVerificationCode(ctx context.Context, to, code string) error {
	body := resendRequest{
		From:    s.fromEmail,
		To:      []string{to},
		Subject: "Your json Verification Code",
		Html: fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f7fa;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px 32px;text-align:center;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a2e;">json</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Your verification code is:</p>
    <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5;padding:16px 0;">%s</div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
  </div>
</body>
</html>`, code),
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal email body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.resend.com/emails", bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	defer resp.Body.Close()

	var result resendResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}

	if resp.StatusCode >= 400 {
		errMsg := result.Error.Message
		if errMsg == "" {
			errMsg = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
		return fmt.Errorf("email API error: %s", errMsg)
	}

	logsdk.Info(ctx, "[Email] 验证码已发送",
		logsdk.Any("to", to),
		logsdk.Any("msg_id", result.ID),
	)
	return nil
}
