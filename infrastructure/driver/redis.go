package driver

import (
	"PycMono/github/json/infrastructure/config"
	"context"
	"fmt"
	"time"

	logsdk "github.com/PycMono/go-logger-sdk"
	"github.com/redis/go-redis/v9"
)

// InitRedis 初始化两个 Redis 客户端（cache + session），返回 (cache, session)
func InitRedis(cfg *config.Config) (cache, session *redis.Client) {
	cache = InitRedisClient(&cfg.Redis.Cache, "cache")
	session = InitRedisClient(&cfg.Redis.Session, "session")
	return cache, session
}

// InitRedisClient creates a Redis client from config
func InitRedisClient(c *config.RedisClientConfig, name string) *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:         c.Addr,
		Password:     c.Password,
		DB:           c.DB,
		PoolSize:     c.PoolSize,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		logsdk.Fatal(context.TODO(), fmt.Sprintf("[Redis:%s] 连接失败", name),
			logsdk.Err(err),
			logsdk.Any("addr", c.Addr),
			logsdk.Any("db", c.DB),
		)
	}

	logsdk.Info(context.TODO(), fmt.Sprintf("[Redis:%s] 已连接", name),
		logsdk.Any("addr", c.Addr),
		logsdk.Any("db", c.DB),
	)
	return rdb
}
