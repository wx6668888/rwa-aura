-- 用户统计数据表
CREATE TABLE IF NOT EXISTS user_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL UNIQUE,
  
  -- 个人数据
  personal_usdt_staked TEXT DEFAULT '0',  -- 个人 USDT 质押（wei）
  personal_rwa_staked TEXT DEFAULT '0',   -- 个人 RWA 质押（wei）
  personal_total_usdt TEXT DEFAULT '0',   -- 个人总质押（USDT 等值）
  
  -- 团队数据
  direct_referrals INTEGER DEFAULT 0,     -- 直推人数
  team_volume_usdt TEXT DEFAULT '0',      -- 团队总质押（USDT 等值，包括自己）
  team_retained_usdt TEXT DEFAULT '0',    -- 总留存（USDT 等值）
  
  -- 等级数据
  current_level INTEGER DEFAULT 1,        -- 当前等级（1-9）
  effective_level INTEGER DEFAULT 1,      -- 有效等级（根据条件计算）
  
  -- 更新时间
  last_calculated_at DATETIME,            -- 最后计算时间
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_level CHECK (current_level >= 1 AND current_level <= 9)
);

CREATE INDEX IF NOT EXISTS idx_user_stats_address ON user_stats(user_address);
CREATE INDEX IF NOT EXISTS idx_user_stats_level ON user_stats(current_level);
CREATE INDEX IF NOT EXISTS idx_user_stats_updated ON user_stats(updated_at);
