package main

import (
	auth_service "PycMono/github/json/application/service/auth"
	token_service "PycMono/github/json/application/service/token"
	"PycMono/github/json/common/prompts"
	"PycMono/github/json/domain/repository"
	"PycMono/github/json/infrastructure/config"
	httpServer "PycMono/github/json/infrastructure/controller/http"
	aiController "PycMono/github/json/infrastructure/controller/http/ai"
	authController "PycMono/github/json/infrastructure/controller/http/auth"
	emailController "PycMono/github/json/infrastructure/controller/http/email"
	proxyController "PycMono/github/json/infrastructure/controller/http/proxy"
	smsController "PycMono/github/json/infrastructure/controller/http/sms"
	tokenController "PycMono/github/json/infrastructure/controller/http/token"
	"PycMono/github/json/infrastructure/driver"
	auth_persistence "PycMono/github/json/infrastructure/persistence"
	ai_image_persistence "PycMono/github/json/infrastructure/persistence/ai_image"
	proxy_persistence "PycMono/github/json/infrastructure/persistence/proxy"
	redis_persistence "PycMono/github/json/infrastructure/persistence/redis"
	sms_persistence "PycMono/github/json/infrastructure/persistence/sms"
	token_persistence "PycMono/github/json/infrastructure/persistence/token"
	fivesim "PycMono/github/json/infrastructure/serviceimpl/51sms"
	aiService "PycMono/github/json/infrastructure/serviceimpl/ai"
	"PycMono/github/json/infrastructure/serviceimpl/email"
	"context"
	"fmt"

	logsdk "github.com/PycMono/go-logger-sdk"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func init() {
	// 初始化日志
	logsdk.SetLogger(logsdk.NewLogrus(logsdk.Options{
		Module:       "json",
		ToFieldsFunc: logsdk.DefaultToFieldsFunc,
	}))
}

func main() {
	cfg := config.Load()

	// ── AI ────────────────────────────────────────────────────────────────────
	aiService.Register(cfg)
	prompts.Init()
	aiController.InitHumanizerEngine()

	// ── MySQL + SMS 数据初始化 ─────────────────────────────────────────────────
	db := driver.InitMySQL(cfg)
	if db != nil {
		initSMSStorage(db)
		initProxyListStorage(db)
	}

	// ── Redis + Auth 初始化 ────────────────────────────────────────────────────
	_, sessionRDB := driver.InitRedis(cfg)
	if db != nil {
		auth_persistence.AutoMigrateAuth(db)
	}
	userRepo := auth_persistence.NewUserRepository(db)
	oauthRepo := auth_persistence.NewOAuthAccountRepository(db)
	sessionRepo := redis_persistence.NewSessionRepository(sessionRDB)
	stateRepo := redis_persistence.NewOAuthStateRepository(sessionRDB)
	emailCodeRepo := redis_persistence.NewEmailCodeRepository(sessionRDB)
	var emailSender repository.IEmailSender
	if cfg.EmailAPIKey != "" {
		emailSender = email.NewResendSender(cfg.EmailAPIKey, "json <noreply@toolboxnova.com>")
	}
	authSvc := auth_service.NewAuthService(cfg.OAuth, userRepo, oauthRepo, sessionRepo, stateRepo, emailCodeRepo, emailSender)
	authController.SetAuthService(authSvc)

	// ── Temp Email SMTP Receiver ────────────────────────────────────────────
	if cfg.TempEmail.Enabled {
		tempEmailRDB := driver.InitRedisClient(&config.RedisClientConfig{
			Addr:     cfg.Redis.Cache.Addr,
			Password: cfg.Redis.Cache.Password,
			PoolSize: 5,
			DB:       7,
		}, "temp_email")
		tempEmailRepo := redis_persistence.NewTempEmailRepository(tempEmailRDB, cfg.TempEmail.MaxMessagesPerInbox)
		emailController.InitEmailService(tempEmailRepo, cfg.TempEmail)

		smtpReceiver := email.NewSMTPReceiver(tempEmailRepo, cfg.TempEmail)
		go func() {
			if err := smtpReceiver.Start(); err != nil {
				logsdk.Error(context.TODO(), "[SMTP] Receiver failed", logsdk.Err(err))
			}
		}()
	}

	// ── Token 初始化 ──────────────────────────────────────────────────
	if db != nil {
		token_persistence.AutoMigrate(db)
		tokenBalRepo := token_persistence.NewTokenBalanceRepository(db)
		tokenTxRepo := token_persistence.NewTokenTransactionRepository(db)
		quotaRuleRepo := token_persistence.NewQuotaRuleRepository(db)
		tokenSvc := token_service.NewTokenService(tokenBalRepo, tokenTxRepo, quotaRuleRepo)
		tokenController.SetTokenService(tokenSvc)
		authSvc.SetTokenService(tokenSvc)
	}

	// ── AI Image 初始化 ──────────────────────────────────────────────────
	if db != nil {
		if err := ai_image_persistence.AutoMigrate(db); err != nil {
			logsdk.Error(context.TODO(), "[AIImage] AutoMigrate failed", logsdk.Err(err))
		}
		aiImageRepo := ai_image_persistence.NewAIImageRepository(db)
		aiController.InitAIImageService(aiImageRepo)
	}

	// ── HTTP Server ───────────────────────────────────────────────────────────
	r := gin.Default()
	httpServer.Setup(r, cfg)

	addr := fmt.Sprintf(":%s", cfg.Port)
	logsdk.Info(context.TODO(), "json starting", logsdk.Any("address", fmt.Sprintf("http://localhost%s", addr)))
	if err := r.Run(addr); err != nil {
		logsdk.Fatal(context.TODO(), "Failed to start server", logsdk.Err(err))
	}
}

func initSMSStorage(db *gorm.DB) {
	sms_persistence.AutoMigrate(db)

	countryRepo := sms_persistence.NewSmsCountryRepository(db)
	productRepo := sms_persistence.NewSmsProductRepository(db)
	priceRepo := sms_persistence.NewSmsPriceRepository(db)

	smsController.SetSMSService(countryRepo, productRepo, priceRepo)

	go reconcileSMSData(countryRepo, productRepo, priceRepo)
}

func reconcileSMSData(
	countryRepo repository.ISmsCountryRepository,
	productRepo repository.ISmsProductRepository,
	priceRepo repository.ISmsPriceRepository,
) {
	syncer := fivesim.NewSyncer(
		fivesim.NewFiveSimClient(),
		countryRepo, productRepo, priceRepo,
	)
	reconcileSMSDataWithSyncer(syncer)
}

type smsStartupSyncer interface {
	Reconcile(ctx context.Context) error
	SyncAll(ctx context.Context) error
}

func reconcileSMSDataWithSyncer(syncer smsStartupSyncer) {
	ctx := context.Background()
	if err := syncer.Reconcile(ctx); err != nil {
		logsdk.Error(ctx, "[main] SMS 数据对账失败", logsdk.Err(err))
		if err := syncer.SyncAll(ctx); err != nil {
			logsdk.Error(ctx, "[main] SMS 全量同步失败", logsdk.Err(err))
		}
	}
}

func initProxyListStorage(db *gorm.DB) {
	if err := proxy_persistence.AutoMigrate(db); err != nil {
		logsdk.Error(context.TODO(), "[ProxyList] AutoMigrate failed", logsdk.Err(err))
	}
	proxyRepo := proxy_persistence.NewProxyRepository(db)
	proxyController.SetProxyListService(proxyRepo)
	go proxyController.StartProxyListSyncLoop(proxyRepo)
}

//
//func main() {
//	app := fx.New(
//		fx.Options(
//			infrastructure.Init(),
//			fx.Invoke(Hook),
//		),
//	)
//
//	app.Run()
//}
//
//// Hook main lifecycle hook
//func Hook(
//	lifecycle fx.Lifecycle,
//
//) {
//	lifecycle.Append(
//		fx.Hook{
//			OnStart: func(ctx context.Context) error {
//
//				return nil
//			},
//			OnStop: func(ctx context.Context) error {
//
//				return nil
//			},
//		},
//	)
//}
