package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// SessionRepository Redis session 存储
type SessionRepository struct{ rdb *redis.Client }

func NewSessionRepository(rdb *redis.Client) *SessionRepository {
	return &SessionRepository{rdb: rdb}
}

func (r *SessionRepository) Create(ctx context.Context, sessionID string, data map[string]interface{}, ttlSeconds int64) error {
	key := fmt.Sprintf("session:%s", sessionID)
	val, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return r.rdb.Set(ctx, key, val, time.Duration(ttlSeconds)*time.Second).Err()
}

func (r *SessionRepository) Get(ctx context.Context, sessionID string) (map[string]string, error) {
	key := fmt.Sprintf("session:%s", sessionID)
	val, err := r.rdb.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	var result map[string]string
	if err := json.Unmarshal([]byte(val), &result); err != nil {
		return nil, err
	}
	return result, nil
}

func (r *SessionRepository) Delete(ctx context.Context, sessionID string) error {
	key := fmt.Sprintf("session:%s", sessionID)
	return r.rdb.Del(ctx, key).Err()
}