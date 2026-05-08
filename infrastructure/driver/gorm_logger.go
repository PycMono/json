package driver

import (
	"context"
	"runtime"
	"strings"
	"time"

	logsdk "github.com/PycMono/go-logger-sdk"

	"gorm.io/gorm/logger"
)

const slowThreshold = 200 * time.Millisecond

// gormLogger 实现 logger.Interface，输出结构化 SQL 日志
type gormLogger struct {
	logLevel logger.LogLevel
}

// NewGormLogger 创建自定义 GORM Logger
// debug=true 记录全部查询；debug=false 仅记录慢查询和错误
func NewGormLogger(debug bool) logger.Interface {
	level := logger.Warn
	if debug {
		level = logger.Info
	}
	return &gormLogger{
		logLevel: level,
	}
}

func (l *gormLogger) LogMode(level logger.LogLevel) logger.Interface {
	newLogger := *l
	newLogger.logLevel = level
	return &newLogger
}

func (l *gormLogger) Info(_ context.Context, msg string, data ...interface{}) {
	if l.logLevel >= logger.Info {
		logsdk.Info(context.TODO(), msg)
	}
}

func (l *gormLogger) Warn(_ context.Context, msg string, data ...interface{}) {
	if l.logLevel >= logger.Warn {
		logsdk.Warn(context.TODO(), msg)
	}
}

func (l *gormLogger) Error(_ context.Context, msg string, data ...interface{}) {
	if l.logLevel >= logger.Error {
		logsdk.Error(context.TODO(), msg)
	}
}

// Trace 记录每条 SQL 的详细信息（核心方法）
func (l *gormLogger) Trace(_ context.Context, begin time.Time, fc func() (string, int64), err error) {
	if l.logLevel <= logger.Silent {
		return
	}

	latency := time.Since(begin)
	sql, rows := fc()

	// 非错误、非慢查询 且 非_debug 模式 → 跳过
	if err == nil && latency < slowThreshold && l.logLevel < logger.Info {
		return
	}

	fields := []logsdk.Fields{
		logsdk.Any("sql", sql),
		logsdk.Any("latency", latency.String()),
		logsdk.Any("rows", rows),
	}

	if err != nil {
		fields = append(fields, logsdk.Err(err))
	}
	if latency >= slowThreshold {
		fields = append(fields, logsdk.Any("slow", true))
	}
	if file := findCaller(); file != "" {
		fields = append(fields, logsdk.Any("line", file))
	}

	if err != nil {
		logsdk.Error(context.TODO(), "[MySQL] query error", fields...)
	} else if latency >= slowThreshold {
		logsdk.Warn(context.TODO(), "[MySQL] slow query", fields...)
	} else {
		logsdk.Info(context.TODO(), "[MySQL] query", fields...)
	}
}

// findCaller 从调用栈回溯，找到第一个业务代码文件位置
func findCaller() string {
	for d := 6; d < 20; d++ {
		_, f, _, ok := runtime.Caller(d)
		if !ok {
			break
		}
		if strings.Contains(f, "gorm.io") ||
			strings.Contains(f, "/runtime/") {
			continue
		}
		return f
	}
	return ""
}
