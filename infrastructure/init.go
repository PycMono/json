package infrastructure

import (
	"PycMono/github/json/infrastructure/config"

	"go.uber.org/fx"
)

// Init 初始化
func Init() fx.Option {
	return fx.Options(
		// 配置
		fx.Supply(config.MustLoad()),
	)
}
