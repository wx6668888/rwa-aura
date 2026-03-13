-- RWA Aura EventMonitor Êï∞ÊçÆÂ∫ìÊû∂ÊûÑ
-- ÂåÖÂê´ÊâÄÊúâ 21 ÁßçÂêàÁ∫¶‰∫ã‰ª∂ÁöÑË°®ÁªìÊûÑ

-- 1. Ë¥®Êäº‰∫ã‰ª∂Ë°®
CREATE TABLE IF NOT EXISTS stake_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  user_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  referrer TEXT,
  stake_id TEXT NOT NULL,
  lock_period INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_hash, stake_id)
);
CREATE INDEX IF NOT EXISTS idx_stake_user ON stake_events(user_address);
CREATE INDEX IF NOT EXISTS idx_stake_block ON stake_events(block_number);

-- 2. ÊèêÁé∞‰∫ã‰ª∂Ë°®
CREATE TABLE IF NOT EXISTS withdrawal_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  user_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  fee TEXT,
  actual_amount TEXT,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_hash, event_type, user_address)
);
CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_events(user_address);
CREATE INDEX IF NOT EXISTS idx_withdrawal_block ON withdrawal_events(block_number);

-- 3. Êé®ËçêÂÖ≥Á≥ªË°®
CREATE TABLE IF NOT EXISTS referral_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL UNIQUE,
  referrer_address TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_referral_user ON referral_bindings(user_address);
CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_bindings(referrer_address);

-- 4. Â•ñÂä±Êõ¥Êñ∞Ë°®
CREATE TABLE IF NOT EXISTS reward_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  usdt_rewards TEXT NOT NULL,
  rwa_rewards TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reward_user ON reward_updates(user_address);
CREATE INDEX IF NOT EXISTS idx_reward_block ON reward_updates(block_number);

-- 5. ËäÇÁÇπÁ≠âÁ∫ßË°®
CREATE TABLE IF NOT EXISTS node_level_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  old_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_level_user ON node_level_updates(user_address);
CREATE INDEX IF NOT EXISTS idx_level_block ON node_level_updates(block_number);
-- 6. stRWA ÷˝‘Ï±Ì
CREATE TABLE IF NOT EXISTS strwa_mints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_strwa_user ON strwa_mints(user_address);
CREATE INDEX IF NOT EXISTS idx_strwa_block ON strwa_mints(block_number);

-- 7. ΩÙº±Ã·œ÷±Ì
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

-- 8. œµÕ≥≈‰÷√±‰∏¸±Ì
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

-- 9. ¥˙±“œ˙ªŸº«¬º±Ì
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

-- 10. Õ¨≤Ω◊¥Ã¨±Ì
CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_synced_block INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO sync_status (id, last_synced_block) VALUES (1, 0);
