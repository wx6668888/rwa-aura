-- 创建所有SQLite中存在但MySQL中缺失的表

-- 1. emergency_withdrawals
CREATE TABLE IF NOT EXISTS emergency_withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  amount VARCHAR(78),
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_address),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. strwa_mints
CREATE TABLE IF NOT EXISTS strwa_mints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  amount VARCHAR(78),
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_address),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. node_level_updates
CREATE TABLE IF NOT EXISTS node_level_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  old_level INT,
  new_level INT,
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_address),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
