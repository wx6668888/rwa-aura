-- 团队业绩分红系统 - 表结构
-- 版本: 1.0-lite
-- 日期: 2026-03-08

USE rwa_protocol;

-- admin_config: 冷启动配置（前3个月预估支出）
CREATE TABLE IF NOT EXISTS admin_config (
  config_key   VARCHAR(100) PRIMARY KEY,
  config_value TEXT NOT NULL,
  description  TEXT,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- team_dividends: 月度分红记录
CREATE TABLE IF NOT EXISTS team_dividends (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_address       VARCHAR(42)   NOT NULL,
  month              VARCHAR(7)    NOT NULL COMMENT 'YYYY-MM',
  node_level         INT           NOT NULL,
  team_stakes        DECIMAL(30,6) NOT NULL,
  team_withdraws     DECIMAL(30,6) NOT NULL,
  team_rewards       DECIMAL(30,6) NOT NULL,
  team_sub_dividends DECIMAL(30,6) NOT NULL,
  net_growth         DECIMAL(30,6) NOT NULL,
  standard_rate      DECIMAL(5,2)  NOT NULL,
  actual_rate        DECIMAL(5,2)  NOT NULL,
  rate_status        ENUM('标准','紧张-10%','不足-20%') NOT NULL,
  dividend_amount    DECIMAL(30,6) NOT NULL,
  status             ENUM('PENDING','RECORDED','FAILED') DEFAULT 'PENDING',
  tx_hash            VARCHAR(66),
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recorded_at        TIMESTAMP NULL,
  UNIQUE KEY uk_user_month (user_address, month),
  INDEX idx_month (month),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- dividend_withdrawals: 提取记录
CREATE TABLE IF NOT EXISTS dividend_withdrawals (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  withdrawal_id  VARCHAR(50)   NOT NULL UNIQUE,
  user_address   VARCHAR(42)   NOT NULL,
  amount         DECIMAL(30,6) NOT NULL,
  status         ENUM('PENDING','SUCCESS','FAILED','MANUAL_REVIEW') DEFAULT 'PENDING',
  retry_count    INT DEFAULT 0,
  max_retries    INT DEFAULT 3,
  tx_hash        VARCHAR(66),
  failure_reason TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at   TIMESTAMP NULL,
  last_retry_at  TIMESTAMP NULL,
  INDEX idx_user (user_address),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- dividend_rate_history: 比例历史
CREATE TABLE IF NOT EXISTS dividend_rate_history (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  month              VARCHAR(7)    NOT NULL,
  version            INT           NOT NULL DEFAULT 1,
  available_balance   DECIMAL(30,6) NOT NULL,
  estimated_payout    DECIMAL(30,6) NOT NULL,
  health_ratio        DECIMAL(10,4) NOT NULL,
  health_status       ENUM('充足','紧张','不足','严重不足') NOT NULL,
  rate_config         JSON          NOT NULL,
  adjustment_type     ENUM('标准','降低10%','降低20%','暂停') NOT NULL,
  adjustment_reason   TEXT,
  announced_at        TIMESTAMP NOT NULL,
  effective_at        TIMESTAMP NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_month_version (month, version),
  INDEX idx_month (month),
  INDEX idx_effective (effective_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- settlement_execution: 结算执行记录
CREATE TABLE IF NOT EXISTS settlement_execution (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  month            VARCHAR(7)  NOT NULL,
  snapshot_time    TIMESTAMP   NOT NULL,
  snapshot_version VARCHAR(50) NOT NULL,
  total_users      INT         NOT NULL DEFAULT 0,
  processed_users  INT         NOT NULL DEFAULT 0,
  failed_users     INT         NOT NULL DEFAULT 0,
  status           ENUM('PENDING','IN_PROGRESS','AWAITING_ADMIN_SIG','COMPLETED','FAILED','SKIPPED') DEFAULT 'PENDING',
  skip_reason      VARCHAR(200),
  started_at       TIMESTAMP NULL,
  completed_at     TIMESTAMP NULL,
  error_message    TEXT NULL,
  UNIQUE KEY uk_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- pool_transfers: 资金池调拨记录
CREATE TABLE IF NOT EXISTS pool_transfers (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  transfer_id   VARCHAR(50)   NOT NULL UNIQUE,
  source_pool   VARCHAR(50)   NOT NULL,
  target_pool   VARCHAR(50)   NOT NULL,
  amount        DECIMAL(30,6) NOT NULL,
  transfer_type ENUM('AUTO','MANUAL','TREASURY') NOT NULL,
  reason        TEXT,
  status        ENUM('PENDING','EXECUTED','FAILED') DEFAULT 'PENDING',
  tx_hash       VARCHAR(66),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at   TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- settlement_failures: 结算失败明细（人工处理队列）
CREATE TABLE IF NOT EXISTS settlement_failures (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  month         VARCHAR(7)  NOT NULL,
  user_address  VARCHAR(42) NOT NULL,
  error_message TEXT,
  retry_count   INT NOT NULL DEFAULT 0,
  status        ENUM('PENDING_RETRY','MANUAL_REVIEW','RESOLVED') NOT NULL DEFAULT 'PENDING_RETRY',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at   TIMESTAMP NULL,
  UNIQUE KEY uk_month_user (month, user_address),
  INDEX idx_month_status (month, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
