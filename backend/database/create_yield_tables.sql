-- 余额快照表：记录每次余额变化
CREATE TABLE IF NOT EXISTS balance_snapshots (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_address VARCHAR(42) NOT NULL,
  asset_type ENUM('USDT', 'RWA') NOT NULL,
  balance_type ENUM('flexible', 'locked_30', 'locked_90', 'locked_180', 'locked_365') NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  timestamp BIGINT NOT NULL,
  event_type ENUM('stake', 'withdraw', 'mature') NOT NULL,
  lock_end_time BIGINT NULL,
  tx_hash VARCHAR(66) NULL,
  INDEX idx_user_asset_time (user_address, asset_type, timestamp),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 收益结算记录表
CREATE TABLE IF NOT EXISTS yield_settlements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_address VARCHAR(42) NOT NULL,
  asset_type ENUM('USDT', 'RWA') NOT NULL,
  settlement_time BIGINT NOT NULL,
  from_time BIGINT NOT NULL,
  to_time BIGINT NOT NULL,
  total_yield DECIMAL(36,18) NOT NULL,
  calculation_details JSON NULL,
  tx_hash VARCHAR(66) NULL,
  INDEX idx_user_time (user_address, settlement_time),
  INDEX idx_settlement_time (settlement_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 锁仓到期记录表
CREATE TABLE IF NOT EXISTS lock_maturity_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_address VARCHAR(42) NOT NULL,
  asset_type ENUM('USDT', 'RWA') NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  lock_period INT NOT NULL,
  maturity_time BIGINT NOT NULL,
  processed_time BIGINT NOT NULL,
  INDEX idx_user_time (user_address, maturity_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
