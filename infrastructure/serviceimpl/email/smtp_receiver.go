package email

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"PycMono/github/json/domain/entity"
	"PycMono/github/json/domain/repository"
	"PycMono/github/json/infrastructure/config"

	logsdk "github.com/PycMono/go-logger-sdk"
	"github.com/emersion/go-smtp"
	"github.com/google/uuid"
	"github.com/jhillyerd/enmime"
)

// SMTPReceiver wraps the go-smtp server
type SMTPReceiver struct {
	server *smtp.Server
	repo   repository.ITempEmailRepository
	cfg    config.TempEmailConfig
}

// NewSMTPReceiver creates a new SMTP receiver
func NewSMTPReceiver(repo repository.ITempEmailRepository, cfg config.TempEmailConfig) *SMTPReceiver {
	return &SMTPReceiver{repo: repo, cfg: cfg}
}

// smtpBackend implements smtp.Backend
type smtpBackend struct {
	repo      repository.ITempEmailRepository
	cfg       config.TempEmailConfig
	domainSet map[string]bool
}

// smtpSession implements smtp.Session
type smtpSession struct {
	backend *smtpBackend
	from    string
	to      []string
}

// NewSession creates a new SMTP session
func (b *smtpBackend) NewSession(c *smtp.Conn) (smtp.Session, error) {
	return &smtpSession{backend: b}, nil
}

func (s *smtpSession) Mail(from string, opts *smtp.MailOptions) error {
	s.from = from
	return nil
}

func (s *smtpSession) Rcpt(to string, opts *smtp.RcptOptions) error {
	to = strings.ToLower(strings.TrimSpace(to))
	to = strings.Trim(to, "<>")

	parts := strings.SplitN(to, "@", 2)
	if len(parts) != 2 {
		return &smtp.SMTPError{
			Code:         550,
			EnhancedCode: smtp.EnhancedCode{5, 1, 1},
			Message:      "Invalid address",
		}
	}

	domain := strings.ToLower(parts[1])
	if !s.backend.domainSet[domain] {
		return &smtp.SMTPError{
			Code:         550,
			EnhancedCode: smtp.EnhancedCode{5, 1, 1},
			Message:      "User does not exist",
		}
	}

	s.to = append(s.to, to)
	return nil
}

func (s *smtpSession) Data(r io.Reader) error {
	envelope, err := enmime.ReadEnvelope(r)
	if err != nil {
		logsdk.Error(context.TODO(), "[SMTP] Failed to parse message", logsdk.Err(err))
		return err
	}

	subject := envelope.GetHeader("Subject")
	if subject == "" {
		subject = "(No Subject)"
	}

	for _, to := range s.to {
		msg := &entity.TempEmailMessage{
			ID:             uuid.New().String(),
			To:             to,
			From:           s.from,
			Subject:        subject,
			TextBody:       envelope.Text,
			HTMLBody:       envelope.HTML,
			ReceivedAt:     time.Now(),
			Size:           len(envelope.Text) + len(envelope.HTML),
			HasAttachments: len(envelope.Attachments) > 0,
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := s.backend.repo.StoreMessage(ctx, msg, int64(s.backend.cfg.TTLSeconds)); err != nil {
			cancel()
			logsdk.Error(context.TODO(), "[SMTP] Failed to store message",
				logsdk.Err(err),
				logsdk.Any("to", to),
			)
			continue
		}
		s.backend.repo.IncrementStats(ctx, "total_received")
		cancel()

		logsdk.Info(context.TODO(), "[SMTP] Message stored",
			logsdk.Any("from", s.from),
			logsdk.Any("to", to),
			logsdk.Any("subject", subject),
		)
	}

	return nil
}

func (s *smtpSession) Reset() {
	s.from = ""
	s.to = nil
}

func (s *smtpSession) Logout() error {
	return nil
}

// Start starts the SMTP server (blocking call)
func (r *SMTPReceiver) Start() error {
	domainSet := make(map[string]bool)
	for _, d := range r.cfg.Domains {
		domainSet[strings.ToLower(d)] = true
	}

	backend := &smtpBackend{
		repo:      r.repo,
		cfg:       r.cfg,
		domainSet: domainSet,
	}

	r.server = smtp.NewServer(backend)
	r.server.Addr = fmt.Sprintf(":%d", r.cfg.SMTPPort)
	if len(r.cfg.Domains) > 0 {
		r.server.Domain = r.cfg.Domains[0]
	}
	r.server.MaxMessageBytes = r.cfg.MaxMessageSize
	r.server.MaxRecipients = 10
	r.server.ReadTimeout = 30 * time.Second
	r.server.WriteTimeout = 30 * time.Second
	r.server.AllowInsecureAuth = true

	logsdk.Info(context.TODO(), "[SMTP] Starting SMTP receiver",
		logsdk.Any("addr", r.server.Addr),
		logsdk.Any("domains", r.cfg.Domains),
	)

	return r.server.ListenAndServe()
}

// Close shuts down the SMTP server
func (r *SMTPReceiver) Close() error {
	if r.server != nil {
		return r.server.Close()
	}
	return nil
}
