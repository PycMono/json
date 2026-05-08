package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// EmailCodeRepository Redis 邮箱验证码存储
type EmailCodeRepository struct{ rdb *redis.Client }

func NewEmailCodeRepository(rdb *redis.Client) *EmailCodeRepository {
	return &EmailCodeRepository{rdb: rdb}
}

func (r *EmailCodeRepository) Set(ctx context.Context, email, code string, ttlSeconds int64) error {
	key := fmt.Sprintf("email_code:%s", email)
	return r.rdb.Set(ctx, key, code, time.Duration(ttlSeconds)*time.Second).Err()
}

// Verify 原子操作：验证码比对 + 删除（防重用）
func (r *EmailCodeRepository) Verify(ctx context.Context, email, code string) (bool, error) {
	key := fmt.Sprintf("email_code:%s", email)

	// Lua 脚本：GET + 比较 + DEL，原子操作
	script := redis.NewScript(`
		local val = redis.call('GET', KEYS[1])
		if not val then
			return 0
		end
		if val == ARGV[1] then
			redis.call('DEL', KEYS[1])
			return 1
		end
		return 0
	`)

	result, err := script.Run(ctx, r.rdb, []string{key}, code).Int()
	if err != nil {
		return false, err
	}
	return result == 1, nil
}
