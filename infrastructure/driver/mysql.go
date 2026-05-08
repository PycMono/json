package driver

import (
	"context"
	"fmt"
	"time"

	logsdk "github.com/PycMono/go-logger-sdk"

	"PycMono/github/json/infrastructure/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// InitMySQL 根据配置创建 GORM *gorm.DB，disabled 时返回 nil
func InitMySQL(cfg *config.Config) *gorm.DB {
	mc := cfg.MySQL
	if !mc.Enabled {
		return nil
	}

	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		mc.User, mc.Password, mc.Host, mc.Port, mc.DBName, mc.Charset,
	)

	logsdk.NewLogrus(logsdk.Options{
		Module: "Mysql",
	})
	gormCfg := &gorm.Config{
		Logger: NewGormLogger(cfg.Debug),
	}

	db, err := gorm.Open(mysql.Open(dsn), gormCfg)
	if err != nil {
		logsdk.Fatal(context.TODO(), "[MySQL] 连接失败", logsdk.Err(err))
	}

	sqlDB, err := db.DB()
	if err != nil {
		logsdk.Fatal(context.TODO(), "[MySQL] 获取底层 sql.DB 失败", logsdk.Err(err))
	}
	sqlDB.SetMaxIdleConns(mc.MaxIdleConns)
	sqlDB.SetMaxOpenConns(mc.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Duration(mc.ConnMaxLifetime) * time.Second)

	logsdk.Info(context.TODO(), "[MySQL] 已连接", logsdk.Any("host", mc.Host), logsdk.Any("port", mc.Port), logsdk.Any("db", mc.DBName))
	return db
}
