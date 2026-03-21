-- 奖励发放日志表
CREATE TABLE IF NOT EXISTS reward_distribution_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stake_id VARCHAR(100) NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  stake_amount VARCHAR(78) NOT NULL,
  asset_type ENUM('USDT', 'RWA') NOT NULL,
  beneficiary_count INT NOT NULL DEFAULT 0,
  total_reward_amount VARCHAR(78) NOT NULL DEFAULT '0',
  status ENUM('success', 'failed') NOT NULL,
  error_message TEXT,
  timestamp DATETIME NOT NULL,
  INDEX idx_stake_id (stake_id),
  INDEX idx_user (user_address),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 国库补充日志表
CREATE TABLE IF NOT EXISTS treasury_topup_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_type ENUM('USDT', 'RWA') NOT NULL,
  amount VARCHAR(78) NOT NULL,
  tx_hash VARCHAR(66),
  status ENUM('success', 'failed') NOT NULL,
  error_message TEXT,
  timestamp DATETIME NOT NULL,
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
