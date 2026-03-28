-- 创建锁仓质押明细表
CREATE TABLE IF NOT EXISTS locked_stakes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  stake_id VARCHAR(100) NOT NULL,
  amount VARCHAR(78) NOT NULL,
  is_rwa_stake TINYINT(1) NOT NULL,
  lock_period INT NOT NULL,
  lock_end_time INT NOT NULL,
  is_withdrawn TINYINT(1) DEFAULT 0,
  block_number INT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_stake (user_address, stake_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_locked_user ON locked_stakes(user_address);
CREATE INDEX idx_locked_withdrawn ON locked_stakes(is_withdrawn);
CREATE INDEX idx_locked_end_time ON locked_stakes(lock_end_time);
