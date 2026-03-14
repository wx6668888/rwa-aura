-- 创建 rewards 表用于记录每日收益发放
CREATE TABLE IF NOT EXISTS rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  rwa_amount DECIMAL(36,18) NOT NULL DEFAULT 0,
  usdt_amount DECIMAL(36,18) NOT NULL DEFAULT 0,
  yield_rate DECIMAL(10,6) NOT NULL,
  pool_health DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_address (user_address),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
