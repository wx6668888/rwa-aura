-- 补充缺失的事件表

-- 1. 紧急提现表
CREATE TABLE IF NOT EXISTS emergency_withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_hash, user_address)
);
CREATE INDEX IF NOT EXISTS idx_emergency_user ON emergency_withdrawals(user_address);

-- 2. 系统配置变更表
CREATE TABLE IF NOT EXISTS system_config_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  affected_address TEXT,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_config_type ON system_config_changes(event_type);

-- 3. 代币销毁记录表
CREATE TABLE IF NOT EXISTS token_burns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_hash)
);
CREATE INDEX IF NOT EXISTS idx_burn_block ON token_burns(block_number);
