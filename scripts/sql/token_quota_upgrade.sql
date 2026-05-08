-- ToolBoxNova Token 额度系统升级脚本
-- 从单一 AI Token 升级为 Quota-as-a-Service
-- 执行方式: mysql -u root -p toolboxnova < scripts/sql/token_quota_upgrade.sql

USE toolboxnova;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_token_balances 表升级
-- ─────────────────────────────────────────────────────────────────────────────

-- 增加 account_type 字段（预留多账户，当前默认 ai_token）
ALTER TABLE `user_token_balances`
    ADD COLUMN IF NOT EXISTS `account_type` VARCHAR(32) NOT NULL DEFAULT 'ai_token' AFTER `user_id`,
    ADD COLUMN IF NOT EXISTS `total_refunded` BIGINT NOT NULL DEFAULT 0 AFTER `total_consumed`;

-- 修改唯一索引：从 user_id 唯一改为 (user_id, account_type) 联合唯一
ALTER TABLE `user_token_balances`
    DROP INDEX IF EXISTS `uk_user_token_balance_user_id`,
    ADD UNIQUE KEY `uk_user_account_type` (`user_id`, `account_type`);

-- 为现有数据填充 account_type
UPDATE `user_token_balances` SET `account_type` = 'ai_token' WHERE `account_type` = '' OR `account_type` IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. token_transactions 表升级
-- ─────────────────────────────────────────────────────────────────────────────

-- 增加 account_type 和 metadata 字段
ALTER TABLE `token_transactions`
    ADD COLUMN IF NOT EXISTS `account_type` VARCHAR(32) NOT NULL DEFAULT 'ai_token' AFTER `user_id`,
    ADD COLUMN IF NOT EXISTS `metadata` JSON DEFAULT NULL AFTER `balance_after`;

-- 修改 tx_type 枚举，增加 bonus
ALTER TABLE `token_transactions`
    MODIFY COLUMN `tx_type` ENUM('grant', 'consume', 'refund', 'bonus') NOT NULL;

-- 重建复合索引，包含 account_type
ALTER TABLE `token_transactions`
    DROP INDEX IF EXISTS `idx_user_created`,
    ADD KEY `idx_user_account_created` (`user_id`, `account_type`, `created_at`);

-- 为现有数据填充 account_type
UPDATE `token_transactions` SET `account_type` = 'ai_token' WHERE `account_type` = '' OR `account_type` IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. 创建 quota_rules 计费规则表
-- ─────────────────────────────────────────────────────────────────────────────
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

-- 初始化默认规则
INSERT INTO `quota_rules` (`code`, `name`, `account_type`, `pricing_type`, `rate`, `min_cost`, `max_cost`, `enabled`)
VALUES ('ai.humanizer', 'AI Humanizer', 'ai_token', 'per_token', 1, 0, 0, 1),
       ('ai.detector', 'AI Detector', 'ai_token', 'per_token', 1, 0, 0, 1),
       ('ai.compete', 'AI Compete', 'ai_token', 'per_token', 1, 0, 0, 1),
       ('ai.image', 'AI Image', 'ai_token', 'per_token', 1, 0, 0, 1)
ON DUPLICATE KEY UPDATE `name`        = VALUES(`name`),
                        `account_type` = VALUES(`account_type`),
                        `pricing_type` = VALUES(`pricing_type`),
                        `rate`         = VALUES(`rate`),
                        `enabled`      = VALUES(`enabled`);

-- 验证
SELECT '✅ Token quota upgrade completed' AS status;
SHOW TABLES LIKE '%token%';
SHOW TABLES LIKE '%quota%';
