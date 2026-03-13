-- ============================================
-- 直推奖励系统数据库表
-- ============================================

-- 1. 直推奖励记录表
CREATE TABLE direct_referral_rewards (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    referrer_address VARCHAR(42) NOT NULL COMMENT '推荐人地址',
    referee_address VARCHAR(42) NOT NULL COMMENT '被推荐人地址',
    stake_id BIGINT NOT NULL COMMENT '质押ID',
    stake_amount DECIMAL(36,18) NOT NULL COMMENT '质押金额（USDT等价值）',
    stake_type ENUM('USDT', 'RWA') NOT NULL COMMENT '质押类型',
    referrer_level TINYINT NOT NULL COMMENT '推荐人等级(L1-L9)',
    reward_rate INT NOT NULL COMMENT '奖励比例（基点，如300=3%）',
    reward_amount DECIMAL(36,18) NOT NULL COMMENT '奖励金额',
    stake_time TIMESTAMP NOT NULL COMMENT '质押时间',
    maturity_time TIMESTAMP NOT NULL COMMENT '到期时间（质押时间+30天）',
    status ENUM('PENDING', 'MATURED', 'PAID', 'CANCELLED') DEFAULT 'PENDING' COMMENT '状态',
    paid_time TIMESTAMP NULL COMMENT '发放时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_referrer (referrer_address),
    INDEX idx_referee (referee_address),
    INDEX idx_status (status),
    INDEX idx_maturity (maturity_time),
    INDEX idx_stake (stake_id)
) COMMENT='直推奖励记录表（30天到期后发放）';

-- 2. 每周结算批次表
CREATE TABLE referral_settlement_batches (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_number VARCHAR(20) NOT NULL UNIQUE COMMENT '批次号（如：2026-W11）',
    start_time TIMESTAMP NOT NULL COMMENT '结算周期开始',
    end_time TIMESTAMP NOT NULL COMMENT '结算周期结束',
    total_rewards DECIMAL(36,18) DEFAULT 0 COMMENT '总奖励金额',
    total_records INT DEFAULT 0 COMMENT '总记录数',
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_batch (batch_number),
    INDEX idx_status (status)
) COMMENT='每周结算批次表';
