-- 用户质押订单表
CREATE TABLE IF NOT EXISTS user_stake_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  stake_id TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'USDT' or 'RWA'
  amount TEXT NOT NULL, -- 18 decimals
  lock_period INTEGER NOT NULL, -- 0=灵活, 30/60/90/180/365=锁仓天数
  lock_start_time INTEGER NOT NULL,
  lock_end_time INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'withdrawn'
  is_flexible BOOLEAN NOT NULL DEFAULT 0, -- 0=锁仓, 1=灵活
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_address, stake_id, asset_type)
);

CREATE INDEX IF NOT EXISTS idx_user_stake_orders_user ON user_stake_orders(user_address);
CREATE INDEX IF NOT EXISTS idx_user_stake_orders_status ON user_stake_orders(status);
CREATE INDEX IF NOT EXISTS idx_user_stake_orders_end_time ON user_stake_orders(lock_end_time);
