CREATE TABLE IF NOT EXISTS tron_deposit_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  address VARCHAR(64) NOT NULL,
  private_key_encrypted TEXT NULL COMMENT '建议存放加密后的私钥；当前仅保留字段，不建议明文入库',
  status ENUM('available', 'bound', 'disabled') NOT NULL DEFAULT 'available',
  bound_user_wallet VARCHAR(42) NULL,
  bound_order_id BIGINT UNSIGNED NULL,
  bound_until DATETIME NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_tron_deposit_address (address),
  KEY idx_tron_deposit_addresses_status (status),
  KEY idx_tron_deposit_addresses_bound_until (bound_until),
  KEY idx_tron_deposit_addresses_bound_user (bound_user_wallet)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tron_deposit_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_no VARCHAR(40) NOT NULL,
  user_wallet VARCHAR(42) NOT NULL,
  deposit_address VARCHAR(64) NOT NULL,
  status ENUM('pending', 'monitoring', 'paid_detected', 'confirmed', 'expired', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  released_at DATETIME NULL,
  last_txid VARCHAR(128) NULL,
  last_paid_amount DECIMAL(36,6) NULL COMMENT 'TRC20 USDT 按 6 位小数记录',
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_tron_deposit_orders_order_no (order_no),
  KEY idx_tron_deposit_orders_user_wallet (user_wallet),
  KEY idx_tron_deposit_orders_status (status),
  KEY idx_tron_deposit_orders_expires_at (expires_at),
  KEY idx_tron_deposit_orders_deposit_address (deposit_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tron_deposit_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  txid VARCHAR(128) NOT NULL,
  from_address VARCHAR(64) NULL,
  to_address VARCHAR(64) NOT NULL,
  token_symbol VARCHAR(16) NOT NULL DEFAULT 'USDT',
  token_contract VARCHAR(64) NULL,
  amount DECIMAL(36,6) NOT NULL,
  block_number BIGINT UNSIGNED NULL,
  confirmed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_tron_deposit_transfers_txid (txid),
  KEY idx_tron_deposit_transfers_order_id (order_id),
  KEY idx_tron_deposit_transfers_to_address (to_address),
  CONSTRAINT fk_tron_deposit_transfers_order
    FOREIGN KEY (order_id) REFERENCES tron_deposit_orders(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ tron_topup tables ready' AS status;
