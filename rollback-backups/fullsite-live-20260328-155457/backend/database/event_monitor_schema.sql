-- EventMonitor 数据库表

-- 质押事件表
CREATE TABLE IF NOT EXISTS stake_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'USDT_STAKE' 或 'RWA_STAKE'
  user_address VARCHAR(42) NOT NULL,
  amount VARCHAR(78) NOT NULL, -- wei 格式字符串
  referrer VARCHAR(42),
  stake_id VARCHAR(100) NOT NULL,
  lock_period INT NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  timestamp INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_address),
  INDEX idx_block (block_number),
  INDEX idx_tx (transaction_hash),
  UNIQUE KEY unique_event (transaction_hash, stake_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 同步状态表
CREATE TABLE IF NOT EXISTS sync_status (
  id INT PRIMARY KEY DEFAULT 1,
  last_synced_block BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始化同步状态
INSERT INTO sync_status (id, last_synced_block) VALUES (1, 0) ON DUPLICATE KEY UPDATE id=id;
