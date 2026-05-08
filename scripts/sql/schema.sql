-- ToolBoxNova Schema
-- 自动建表脚本（GORM AutoMigrate 在启动时同样会执行此操作）
-- 使用方式: mysql -u root -p < scripts/sql/schema.sql

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `toolboxnova` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 切换到目标数据库
USE toolboxnova;

-- sms_country  国家表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sms_country`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `name`
    VARCHAR
(
    64
) NOT NULL COMMENT '5SIM 内部 key，如 russia',
    `display_name` VARCHAR
(
    128
) NOT NULL COMMENT '展示名，如 Russia',
    `iso2` VARCHAR
(
    4
) NOT NULL COMMENT 'ISO 3166-1 alpha-2，如 RU',
    `flag` VARCHAR
(
    16
) NOT NULL COMMENT 'Emoji 旗帜',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY
(
    `id`
),
    UNIQUE KEY `uk_name`
(
    `name`
)
    ) ENGINE = InnoDB
    DEFAULT CHARSET = utf8mb4
    COLLATE = utf8mb4_unicode_ci
    COMMENT ='SMS 国家表';

-- ─────────────────────────────────────────────────────────────────────────────
-- sms_product  产品/服务表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sms_product`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `name`
    VARCHAR
(
    64
) NOT NULL COMMENT '5SIM 内部 key，如 whatsapp',
    `display_name` VARCHAR
(
    128
) NOT NULL COMMENT '展示名，如 WhatsApp',
    `category` VARCHAR
(
    32
) NOT NULL DEFAULT 'activation',
    `icon` VARCHAR
(
    64
) NOT NULL COMMENT '图标 key 或 Emoji',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY
(
    `id`
),
    UNIQUE KEY `uk_name`
(
    `name`
)
    ) ENGINE = InnoDB
    DEFAULT CHARSET = utf8mb4
    COLLATE = utf8mb4_unicode_ci
    COMMENT ='SMS 产品/服务表';

-- ─────────────────────────────────────────────────────────────────────────────
-- sms_price  价格表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sms_price`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `country`
    VARCHAR
(
    64
) NOT NULL COMMENT '国家 5SIM key',
    `product` VARCHAR
(
    64
) NOT NULL COMMENT '产品 5SIM key',
    `operator` VARCHAR
(
    64
) NOT NULL DEFAULT 'any' COMMENT '运营商，any 表示任意',
    `cost` INT NOT NULL DEFAULT 0 COMMENT '价格（分）',
    `count` INT NOT NULL DEFAULT 0 COMMENT '可用库存',
    `rate` DOUBLE NOT NULL DEFAULT 0 COMMENT '成功率',
    `synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后同步时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY
(
    `id`
),
    UNIQUE KEY `uk_country_product_operator`
(
    `country`,
    `product`,
    `operator`
),
    KEY `idx_country`
(
    `country`
),
    KEY `idx_product`
(
    `product`
)
    ) ENGINE = InnoDB
    DEFAULT CHARSET = utf8mb4
    COLLATE = utf8mb4_unicode_ci
    COMMENT ='SMS 价格表（从 5SIM 同步）';


-- 用户表
CREATE TABLE IF NOT EXISTS `users`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `email`
    VARCHAR
(
    255
) NOT NULL,
    `name` VARCHAR
(
    255
) NOT NULL DEFAULT '',
    `given_name` VARCHAR
(
    128
) NOT NULL DEFAULT '',
    `family_name` VARCHAR
(
    128
) NOT NULL DEFAULT '',
    `avatar_url` VARCHAR
(
    512
) NOT NULL DEFAULT '',
    `locale` VARCHAR
(
    10
) NOT NULL DEFAULT 'en',
    `preferred_language` VARCHAR
(
    10
) NOT NULL DEFAULT '',
    `email_verified` TINYINT
(
    1
) NOT NULL DEFAULT 0,
    `last_login_at` DATETIME
(
    3
) DEFAULT NULL,
    `login_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
),
    `updated_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
) ON UPDATE CURRENT_TIMESTAMP
(
    3
),
    PRIMARY KEY
(
    `id`
),
    UNIQUE KEY `idx_email`
(
    `email`
)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE =utf8mb4_unicode_ci;

-- OAuth 账号关联表
CREATE TABLE IF NOT EXISTS `oauth_accounts`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `user_id`
    BIGINT
    UNSIGNED
    NOT
    NULL,
    `provider`
    VARCHAR
(
    32
) NOT NULL,
    `provider_user_id` VARCHAR
(
    255
) NOT NULL,
    `access_token` VARCHAR
(
    2048
) DEFAULT '',
    `refresh_token` VARCHAR
(
    2048
) DEFAULT '',
    `expires_at` DATETIME
(
    3
) DEFAULT NULL,
    `created_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
),
    `updated_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
) ON UPDATE CURRENT_TIMESTAMP
(
    3
),
    PRIMARY KEY
(
    `id`
),
    UNIQUE KEY `uk_provider_uid`
(
    `provider`,
    `provider_user_id`
),
    KEY `idx_user_id`
(
    `user_id`
),
    CONSTRAINT `fk_oauth_user` FOREIGN KEY
(
    `user_id`
) REFERENCES `users`
(
    `id`
)
  ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE =utf8mb4_unicode_ci;

-- 用户 Token 余额表（支持多账户预留）
CREATE TABLE IF NOT EXISTS `user_token_balances`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `user_id`
    VARCHAR
(
    64
) NOT NULL,
    `account_type` VARCHAR(32) NOT NULL DEFAULT 'ai_token',
    `total_granted` BIGINT NOT NULL DEFAULT 0,
    `total_consumed` BIGINT NOT NULL DEFAULT 0,
    `total_refunded` BIGINT NOT NULL DEFAULT 0,
    `balance` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
),
    `updated_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
) ON UPDATE CURRENT_TIMESTAMP
(
    3
),
    PRIMARY KEY
(
    `id`
),
    UNIQUE KEY `uk_user_account_type`
(
    `user_id`,
    `account_type`
),
    KEY `idx_user_token_balance`
(
    `balance`
)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE =utf8mb4_unicode_ci;

-- Token 流水明细表
CREATE TABLE IF NOT EXISTS `token_transactions`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `user_id`
    VARCHAR
(
    64
) NOT NULL,
    `account_type` VARCHAR(32) NOT NULL DEFAULT 'ai_token',
    `tx_type` ENUM
(
    'grant',
    'consume',
    'refund',
    'bonus'
) NOT NULL,
    `amount` BIGINT NOT NULL,
    `tool_name` VARCHAR
(
    64
) NOT NULL DEFAULT '',
    `model_name` VARCHAR
(
    128
) NOT NULL DEFAULT '',
    `prompt_tokens` INT NOT NULL DEFAULT 0,
    `completion_tokens` INT NOT NULL DEFAULT 0,
    `total_tokens` INT NOT NULL DEFAULT 0,
    `balance_after` BIGINT NOT NULL,
    `metadata` JSON DEFAULT NULL,
    `note` VARCHAR
(
    255
) NOT NULL DEFAULT '',
    `created_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
),
    PRIMARY KEY
(
    `id`
),
    KEY `idx_tx_type`
(
    `tx_type`
),
    KEY `idx_tool_name`
(
    `tool_name`
),
    KEY `idx_user_account_created`
(
    `user_id`,
    `account_type`,
    `created_at`
)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE =utf8mb4_unicode_ci;

-- 计费规则表
CREATE TABLE IF NOT EXISTS `quota_rules`
(
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code`          VARCHAR(64)  NOT NULL COMMENT '规则编码，如 ai.humanizer',
    `name`          VARCHAR(128) NOT NULL COMMENT '可读名称',
    `account_type`  VARCHAR(32)  NOT NULL DEFAULT 'ai_token' COMMENT '关联账户类型',
    `pricing_type`  VARCHAR(32)  NOT NULL DEFAULT 'per_token' COMMENT '计费方式: per_token|per_call|per_char',
    `rate`          BIGINT       NOT NULL DEFAULT 1 COMMENT '单价（每单位扣多少 token）',
    `min_cost`      BIGINT       NOT NULL DEFAULT 0 COMMENT '最低扣费',
    `max_cost`      BIGINT       NOT NULL DEFAULT 0 COMMENT '最高扣费（0=无上限）',
    `enabled`       TINYINT(1)   NOT NULL DEFAULT 1,
    `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_code` (`code`),
    KEY `idx_enabled` (`enabled`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT ='计费规则表';

-- ─────────────────────────────────────────────────────────────────────────────
-- proxies  代理服务器表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `proxies`
(
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ip`            VARCHAR(45)  NOT NULL COMMENT 'IP 地址',
    `port`          SMALLINT UNSIGNED NOT NULL COMMENT '端口',
    `protocol`      ENUM('http','https','socks4','socks5') NOT NULL DEFAULT 'http' COMMENT '协议',
    `country_code`  CHAR(2)      NOT NULL DEFAULT '' COMMENT '国家代码',
    `country_name`  VARCHAR(100) NOT NULL DEFAULT '' COMMENT '国家名称',
    `anonymity`     ENUM('transparent','anonymous','elite') NOT NULL DEFAULT 'anonymous' COMMENT '匿名度',
    `latency_ms`    INT          NOT NULL DEFAULT 0 COMMENT '延迟(ms)',
    `uptime_pct`    DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '可用率(%)',
    `last_checked`  DATETIME     NOT NULL COMMENT '最后检测时间',
    `is_alive`      TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否存活',
    `source`        VARCHAR(50)  NOT NULL DEFAULT 'proxyscrape' COMMENT '来源',
    `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_proxy_ip_port_proto` (`ip`, `port`, `protocol`),
    KEY `idx_protocol` (`protocol`),
    KEY `idx_country_code` (`country_code`),
    KEY `idx_anonymity` (`anonymity`),
    KEY `idx_latency` (`latency_ms`),
    KEY `idx_uptime` (`uptime_pct`),
    KEY `idx_last_checked` (`last_checked`),
    KEY `idx_is_alive` (`is_alive`),
    KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代理服务器表';

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_image_tasks  AI 生图任务表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ai_image_tasks`
(
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `task_id`             VARCHAR(36)  NOT NULL COMMENT 'UUID',
    `user_id`             BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户ID，0=游客',
    `session_key`         VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '会话标识',
    `mode`                VARCHAR(16)  NOT NULL DEFAULT 'text2img' COMMENT '模式: text2img|img2img',
    `prompt`              TEXT COMMENT '正向提示词',
    `negative_prompt`     TEXT COMMENT '负向提示词',
    `model_id`            VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '模型ID',
    `width`               INT          NOT NULL DEFAULT 512,
    `height`              INT          NOT NULL DEFAULT 512,
    `batch_count`         INT          NOT NULL DEFAULT 1,
    `steps`               INT          NOT NULL DEFAULT 20,
    `cfg_scale`           FLOAT        NOT NULL DEFAULT 7,
    `sampler`             VARCHAR(32)  NOT NULL DEFAULT 'euler' COMMENT '采样器',
    `seed`                BIGINT       NOT NULL DEFAULT -1,
    `hires_enabled`       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '高清修复',
    `denoising_strength`  FLOAT        NOT NULL DEFAULT 0.75,
    `status`              VARCHAR(16)  NOT NULL DEFAULT 'pending' COMMENT '状态: pending|success|failed',
    `error_msg`           VARCHAR(512) NOT NULL DEFAULT '' COMMENT '错误信息',
    `result_urls`         JSON COMMENT '结果图片URL数组',
    `provider`            VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '提供商: stability|openai|sdwebui',
    `cost_seconds`        FLOAT        NOT NULL DEFAULT 0 COMMENT '耗时(秒)',
    `expire_at`           DATETIME(3) COMMENT '过期清理时间',
    `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_task_id` (`task_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_session_key` (`session_key`),
    KEY `idx_status` (`status`),
    KEY `idx_expire_at` (`expire_at`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI生图任务表';

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_image_models  AI 生图模型配置表
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ai_image_models`
(
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `model_id`      VARCHAR(64)  NOT NULL COMMENT '唯一模型标识',
    `name`          VARCHAR(128) NOT NULL COMMENT '显示名称',
    `provider`      VARCHAR(32)  NOT NULL COMMENT '提供商: stability|openai|sdwebui',
    `category`      VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '分类: general|anime|realistic|art',
    `description`   VARCHAR(512) NOT NULL DEFAULT '' COMMENT '描述',
    `preview_url`   VARCHAR(512) NOT NULL DEFAULT '' COMMENT '预览图URL',
    `is_default`    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否默认',
    `is_active`     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否启用',
    `sort_order`    INT          NOT NULL DEFAULT 0 COMMENT '排序',
    `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_model_id` (`model_id`),
    KEY `idx_provider` (`provider`),
    KEY `idx_is_active` (`is_active`),
    KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI生图模型配置表';

-- 验证
SELECT '✅ All tables created successfully' AS status;
SHOW
TABLES;


     -- =================================================================
-- Auth Schema — users + oauth_accounts
-- 手动执行此脚本创建用户认证相关表
-- =================================================================

-- 用户表
CREATE TABLE IF NOT EXISTS `users`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `email`
    VARCHAR
(
    255
) NOT NULL,
    `name` VARCHAR
(
    255
) NOT NULL DEFAULT '',
    `given_name` VARCHAR
(
    128
) NOT NULL DEFAULT '',
    `family_name` VARCHAR
(
    128
) NOT NULL DEFAULT '',
    `avatar_url` VARCHAR
(
    512
) NOT NULL DEFAULT '',
    `locale` VARCHAR
(
    10
) NOT NULL DEFAULT 'en',
    `preferred_language` VARCHAR
(
    10
) NOT NULL DEFAULT '',
    `email_verified` TINYINT
(
    1
) NOT NULL DEFAULT 0,
    `last_login_at` DATETIME
(
    3
) DEFAULT NULL,
    `login_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
),
    `updated_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
) ON UPDATE CURRENT_TIMESTAMP
(
    3
),
    PRIMARY KEY
(
    `id`
),
    UNIQUE KEY `idx_email`
(
    `email`
)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE =utf8mb4_unicode_ci;

-- OAuth 账号关联表
CREATE TABLE IF NOT EXISTS `oauth_accounts`
(
    `id`
    BIGINT
    UNSIGNED
    NOT
    NULL
    AUTO_INCREMENT,
    `user_id`
    BIGINT
    UNSIGNED
    NOT
    NULL,
    `provider`
    VARCHAR
(
    32
) NOT NULL,
    `provider_user_id` VARCHAR
(
    255
) NOT NULL,
    `access_token` VARCHAR
(
    2048
) DEFAULT '',
    `refresh_token` VARCHAR
(
    2048
) DEFAULT '',
    `expires_at` DATETIME
(
    3
) DEFAULT NULL,
    `created_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
),
    `updated_at` DATETIME
(
    3
) NOT NULL DEFAULT CURRENT_TIMESTAMP
(
    3
) ON UPDATE CURRENT_TIMESTAMP
(
    3
),
    PRIMARY KEY
(
    `id`
),
    UNIQUE KEY `uk_provider_uid`
(
    `provider`,
    `provider_user_id`
),
    KEY `idx_user_id`
(
    `user_id`
),
    CONSTRAINT `fk_oauth_user` FOREIGN KEY
(
    `user_id`
) REFERENCES `users`
(
    `id`
)
  ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE =utf8mb4_unicode_ci;

-- 验证
SELECT '✅ Auth tables created successfully' AS status;
SHOW
TABLES LIKE '%users%';
SHOW
TABLES LIKE '%oauth%';