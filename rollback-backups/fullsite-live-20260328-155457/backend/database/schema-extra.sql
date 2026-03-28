-- 补充数据库表

-- 1. 用户快照表（缓存用户状态，减少链上查询）
CREATE TABLE IF NOT EXISTS user_snapshots (
  user_address TEXT PRIMARY KEY,
  total_usdt_staked TEXT NOT NULL DEFAULT '0',
  total_rwa_staked TEXT NOT NULL DEFAULT '0',
  usdt_rewards TEXT NOT NULL DEFAULT '0',
  rwa_rewards TEXT NOT NULL DEFAULT '0',
  node_level INTEGER NOT NULL DEFAULT 1,
  referrer_address TEXT,
  direct_referrals INTEGER NOT NULL DEFAULT 0,
  team_volume TEXT NOT NULL DEFAULT '0',
  last_updated INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_snapshot_level ON user_snapshots(node_level);
CREATE INDEX IF NOT EXISTS idx_snapshot_referrer ON user_snapshots(referrer_address);

-- 2. 锁仓记录表
CREATE TABLE IF NOT EXISTS locked_stakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'USDT' 或 'RWA'
  amount TEXT NOT NULL,
  lock_period INTEGER NOT NULL, -- 天数
  stake_time INTEGER NOT NULL,
  unlock_time INTEGER NOT NULL,
  is_unlocked INTEGER NOT NULL DEFAULT 0,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_hash, user_address, asset_type)
);
CREATE INDEX IF NOT EXISTS idx_locked_user ON locked_stakes(user_address);
CREATE INDEX IF NOT EXISTS idx_locked_unlock ON locked_stakes(unlock_time);

-- 3. 推荐奖励表
CREATE TABLE IF NOT EXISTS referral_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_address TEXT NOT NULL,
  referee_address TEXT NOT NULL,
  stake_amount TEXT NOT NULL,
  reward_amount TEXT NOT NULL,
  reward_type TEXT NOT NULL, -- 'DIRECT' 或 'INDIRECT'
  level INTEGER NOT NULL, -- 推荐层级
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ref_reward_referrer ON referral_rewards(referrer_address);
CREATE INDEX IF NOT EXISTS idx_ref_reward_referee ON referral_rewards(referee_address);

-- 4. 系统配置历史表
CREATE TABLE IF NOT EXISTS system_config_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_config_key ON system_config_history(config_key);
