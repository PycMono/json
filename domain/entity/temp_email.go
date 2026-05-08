package entity

import "time"

// TempEmailMessage represents a single received email
type TempEmailMessage struct {
	ID             string    `json:"id"`
	To             string    `json:"to"`
	From           string    `json:"from"`
	Subject        string    `json:"subject"`
	TextBody       string    `json:"text_body"`
	HTMLBody       string    `json:"html_body"`
	ReceivedAt     time.Time `json:"received_at"`
	Size           int       `json:"size"`
	HasAttachments bool      `json:"has_attachments"`
}

// TempEmailInbox represents the metadata for an active inbox
type TempEmailInbox struct {
	Address   string    `json:"address"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	MsgCount  int       `json:"msg_count"`
}