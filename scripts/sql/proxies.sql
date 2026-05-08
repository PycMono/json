-- proxies 代理服务器列表
-- ─────────────────────────────────────────────────────────────────────────────
-- 用途: 存储从公开 API 同步的免费代理服务器数据
-- 使用方式: mysql -u root -p toolboxnova < scripts/sql/proxies.sql

USE toolboxnova;

-- 代理服务器表
CREATE TABLE IF NOT EXISTS `proxies`
(
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ip`            VARCHAR(45) NOT NULL COMMENT 'IPv4 或 IPv6 地址',
    `port`          SMALLINT UNSIGNED NOT NULL COMMENT '端口号 (1-65535)',
    `protocol`      ENUM('http','https','socks4','socks5') NOT NULL DEFAULT 'http' COMMENT '代理协议',
    `country_code`  CHAR(2) NOT NULL DEFAULT '' COMMENT 'ISO 3166-1 alpha-2 国家代码',
    `country_name`  VARCHAR(100) NOT NULL DEFAULT '' COMMENT '国家名称',
    `anonymity`     ENUM('transparent','anonymous','elite') NOT NULL DEFAULT 'anonymous' COMMENT '匿名等级',
    `latency_ms`    INT NOT NULL DEFAULT 0 COMMENT '响应延迟（毫秒）',
    `uptime_pct`    DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '在线率百分比 (0-100)',
    `last_checked`  DATETIME NOT NULL COMMENT '最后检测时间',
    `is_alive`      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在线',
    `source`        VARCHAR(50) NOT NULL DEFAULT 'proxyscrape' COMMENT '数据来源',
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ip_port_protocol` (`ip`, `port`, `protocol`),
    KEY `idx_protocol` (`protocol`),
    KEY `idx_country_code` (`country_code`),
    KEY `idx_anonymity` (`anonymity`),
    KEY `idx_is_alive` (`is_alive`),
    KEY `idx_latency_ms` (`latency_ms`),
    KEY `idx_uptime_pct` (`uptime_pct`),
    KEY `idx_last_checked` (`last_checked`),
    KEY `idx_updated_at` (`updated_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT ='免费代理服务器列表';

-- 创建全文索引用于搜索（可选）
-- ALTER TABLE `proxies` ADD FULLTEXT INDEX `ft_country_name` (`country_name`);
