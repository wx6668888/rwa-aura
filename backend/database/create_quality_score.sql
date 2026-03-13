-- 推荐质量考核表
CREATE TABLE IF NOT EXISTS referral_quality_score (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_address VARCHAR(42) NOT NULL UNIQUE,
  
  -- 基础数据
  total_referrals INT DEFAULT 0,              -- 总推荐人数
  valid_referrals INT DEFAULT 0,              -- 有效推荐人数（≥100U且≥30天）
  total_stake_amount DECIMAL(20,2) DEFAULT 0, -- 推荐总质押金额
  emergency_withdrawals INT DEFAULT 0,         -- 紧急提现次数
  
  -- 考核指标（各项得分）
  referral_count_score DECIMAL(5,2) DEFAULT 0,    -- 推荐人数得分（30分）
  valid_rate_score DECIMAL(5,2) DEFAULT 0,        -- 有效直推率得分（25分）
  stake_amount_score DECIMAL(5,2) DEFAULT 0,      -- 质押总金额得分（30分）
  emergency_penalty DECIMAL(5,2) DEFAULT 0,       -- 紧急提现扣分（-15分）
  
  -- 总分
  total_score DECIMAL(5,2) DEFAULT 0,             -- 总分（满分100）
  grade VARCHAR(10) DEFAULT 'C',                  -- 等级（S/A/B/C/D）
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user (user_address),
  INDEX idx_score (total_score DESC)
);
