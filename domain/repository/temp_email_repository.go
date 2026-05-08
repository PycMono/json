package repository

import (
	"context"

	"PycMono/github/json/domain/entity"
)

// ITempEmailRepository temporary email storage interface
type ITempEmailRepository interface {
	// RegisterInbox creates a new inbox record (for tracking active addresses)
	RegisterInbox(ctx context.Context, address string, ttlSeconds int64) error

	// InboxExists checks whether an inbox has been registered
	InboxExists(ctx context.Context, address string) (bool, error)

	// StoreMessage stores a received email message and updates the inbox message list
	StoreMessage(ctx context.Context, msg *entity.TempEmailMessage, ttlSeconds int64) error

	// GetMessages retrieves all messages for a given address
	GetMessages(ctx context.Context, address string) ([]*entity.TempEmailMessage, error)

	// DeleteInbox removes an inbox and all its messages
	DeleteInbox(ctx context.Context, address string) error

	// IncrementStats atomically increments a stats counter
	IncrementStats(ctx context.Context, key string) error

	// GetStats retrieves stats counters
	GetStats(ctx context.Context, keys []string) (map[string]int64, error)
}
