package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// OAuthStateRepository Redis OAuth state 存储（CSRF 防护）
type OAuthStateRepository struct{ rdb *redis.Client }

func NewOAuthStateRepository(rdb *redis.Client) *OAuthStateRepository {
	return &OAuthStateRepository{rdb: rdb}
}

func (r *OAuthStateRepository) Set(ctx context.Context, state string, data map[string]interface{}, ttlSeconds int64) error {
	key := fmt.Sprintf("oauth_state:%s", state)
	val, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return r.rdb.Set(ctx, key, val, time.Duration(ttlSeconds)*time.Second).Err()
}

// GetAndDelete 原子操作：获取并删除 state（防重放）
func (r *OAuthStateRepository) GetAndDelete(ctx context.Context, state string) (map[string]string, error) {
	key := fmt.Sprintf("oauth_state:%s", state)

	// 使用 Lua 脚本保证原子性
	script := redis.NewScript(`
		local val = redis.call('GET', KEYS[1])
		if val then
			redis.call('DEL', KEYS[1])
		end
		return val
	`)

	result, err := script.Run(ctx, r.rdb, []string{key}).Result()
	if err != nil {
		return nil, err
	}

	if result == nil {
		return nil, fmt.Errorf("state not found or expired")
	}

	val, ok := result.(string)
	if !ok {
		return nil, fmt.Errorf("invalid state data type")
	}

	var data map[string]string
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, err
	}
	return data, nil
}