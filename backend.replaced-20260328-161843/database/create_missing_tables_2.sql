-- 4. system_config_changes
CREATE TABLE IF NOT EXISTS system_config_changes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  affected_address VARCHAR(42),
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. token_burns
CREATE TABLE IF NOT EXISTS token_burns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  amount VARCHAR(78),
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. sync_status
CREATE TABLE IF NOT EXISTS sync_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  last_synced_block BIGINT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. user_stake_orders
CREATE TABLE IF NOT EXISTS user_stake_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  stake_id VARCHAR(50) NOT NULL,
  asset_type VARCHAR(10),
  amount VARCHAR(78),
  lock_period INT,
  lock_start_time BIGINT,
  lock_end_time BIGINT,
  status VARCHAR(20),
  is_flexible BOOLEAN DEFAULT FALSE,
  created_at BIGINT,
  updated_at BIGINT,
  INDEX idx_user (user_address),
  INDEX idx_stake_id (stake_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
