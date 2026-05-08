package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"PycMono/github/json/domain/entity"

	"github.com/redis/go-redis/v9"
)

// TempEmailRepository Redis-based temporary email storage
type TempEmailRepository struct {
	rdb                 *redis.Client
	maxMessagesPerInbox int64
}

// NewTempEmailRepository creates a new Redis temp email repository
func NewTempEmailRepository(rdb *redis.Client, maxMessagesPerInbox int) *TempEmailRepository {
	return &TempEmailRepository{
		rdb:                 rdb,
		maxMessagesPerInbox: int64(maxMessagesPerInbox),
	}
}

// --- Key patterns ---
// temp_inbox:{address}         String (JSON)  — inbox metadata
// temp_inbox_msgs:{address}    List (msg IDs) — ordered message IDs
// temp_msg:{msgID}             String (JSON)  — full message content
// temp_stats:{key}             String (int)   — daily counter

func inboxKey(addr string) string { return fmt.Sprintf("temp_inbox:%s", addr) }
func msgsKey(addr string) string  { return fmt.Sprintf("temp_inbox_msgs:%s", addr) }
func msgKey(id string) string     { return fmt.Sprintf("temp_msg:%s", id) }
func statsKey(k string) string    { return fmt.Sprintf("temp_stats:%s", k) }

// RegisterInbox creates a new inbox record in Redis
func (r *TempEmailRepository) RegisterInbox(ctx context.Context, address string, ttlSeconds int64) error {
	key := inboxKey(address)
	data := &entity.TempEmailInbox{
		Address:   address,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(time.Duration(ttlSeconds) * time.Second),
		MsgCount:  0,
	}
	val, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return r.rdb.Set(ctx, key, val, time.Duration(ttlSeconds)*time.Second).Err()
}

// InboxExists checks whether an inbox has been registered
func (r *TempEmailRepository) InboxExists(ctx context.Context, address string) (bool, error) {
	n, err := r.rdb.Exists(ctx, inboxKey(address)).Result()
	return n > 0, err
}

// StoreMessage stores a received email message
func (r *TempEmailRepository) StoreMessage(ctx context.Context, msg *entity.TempEmailMessage, ttlSeconds int64) error {
	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	iKey := inboxKey(msg.To)
	mKey := msgsKey(msg.To)
	mgKey := msgKey(msg.ID)
	ttl := time.Duration(ttlSeconds) * time.Second

	// Check message count and evict oldest if over limit
	count, _ := r.rdb.LLen(ctx, mKey).Result()
	if count >= r.maxMessagesPerInbox {
		oldestID, err := r.rdb.LPop(ctx, mKey).Result()
		if err == nil {
			r.rdb.Del(ctx, msgKey(oldestID))
		}
	}

	pipe := r.rdb.Pipeline()
	pipe.Set(ctx, mgKey, msgJSON, ttl)
	pipe.RPush(ctx, mKey, msg.ID)
	pipe.Expire(ctx, mKey, ttl)
	pipe.Expire(ctx, iKey, ttl)
	_, err = pipe.Exec(ctx)
	return err
}

// GetMessages retrieves all messages for a given address
func (r *TempEmailRepository) GetMessages(ctx context.Context, address string) ([]*entity.TempEmailMessage, error) {
	mKey := msgsKey(address)

	// Get message IDs
	msgIDs, err := r.rdb.LRange(ctx, mKey, 0, -1).Result()
	if err != nil {
		return nil, err
	}
	if len(msgIDs) == 0 {
		return nil, nil
	}

	// Build MGET keys
	keys := make([]string, len(msgIDs))
	for i, id := range msgIDs {
		keys[i] = msgKey(id)
	}

	results, err := r.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, err
	}

	var messages []*entity.TempEmailMessage
	for _, res := range results {
		if res == nil {
			continue // message TTL expired
		}
		var msg entity.TempEmailMessage
		if err := json.Unmarshal([]byte(res.(string)), &msg); err != nil {
			continue
		}
		messages = append(messages, &msg)
	}
	return messages, nil
}

// DeleteInbox removes an inbox and all its messages atomically
func (r *TempEmailRepository) DeleteInbox(ctx context.Context, address string) error {
	script := redis.NewScript(`
		local msgsKey = KEYS[2]
		local msgIds = redis.call('LRANGE', msgsKey, 0, -1)
		for _, id in ipairs(msgIds) do
			redis.call('DEL', 'temp_msg:' .. id)
		end
		redis.call('DEL', KEYS[1], KEYS[2])
		return 1
	`)

	iKey := inboxKey(address)
	mKey := msgsKey(address)
	_, err := script.Run(ctx, r.rdb, []string{iKey, mKey}).Result()
	return err
}

// IncrementStats atomically increments a stats counter
func (r *TempEmailRepository) IncrementStats(ctx context.Context, key string) error {
	k := statsKey(key)
	pipe := r.rdb.Pipeline()
	pipe.Incr(ctx, k)
	pipe.Expire(ctx, k, 48*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

// GetStats retrieves stats counters
func (r *TempEmailRepository) GetStats(ctx context.Context, keys []string) (map[string]int64, error) {
	fullKeys := make([]string, len(keys))
	for i, k := range keys {
		fullKeys[i] = statsKey(k)
	}

	results, err := r.rdb.MGet(ctx, fullKeys...).Result()
	if err != nil {
		return nil, err
	}

	m := make(map[string]int64)
	for i, res := range results {
		if res == nil {
			m[keys[i]] = 0
			continue
		}
		var n int64
		fmt.Sscanf(res.(string), "%d", &n)
		m[keys[i]] = n
	}
	return m, nil
}
