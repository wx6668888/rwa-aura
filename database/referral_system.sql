-- ============================================
-- 推荐系统数据库表设计
-- ============================================

-- 1. 用户推荐关系表
CREATE TABLE referral_relationships (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_address VARCHAR(42) NOT NULL UNIQUE COMMENT '用户地址',
    referrer_address VARCHAR(42) COMMENT '推荐人地址',
    bind_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '绑定时间',
    first_stake_time TIMESTAMP COMMENT '首次质押时间',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    
    INDEX idx_user (user_address),
    INDEX idx_referrer (referrer_address),
    INDEX idx_bind_time (bind_time)
) COMMENT='用户推荐关系表（永久绑定）';

-- 2. 用户等级表
CREATE TABLE user_levels (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_address VARCHAR(42) NOT NULL UNIQUE COMMENT '用户地址',
    node_level TINYINT DEFAULT 1 COMMENT '节点等级 (1-9)',
    total_staked DECIMAL(36,18) DEFAULT 0 COMMENT '总质押金额（USDT等价值）',
    total_team_staked DECIMAL(36,18) DEFAULT 0 COMMENT '团队总质押',
    direct_referrals INT DEFAULT 0 COMMENT '直推人数',
    team_size INT DEFAULT 0 COMMENT '团队总人数',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_address),
    INDEX idx_level (node_level)
) COMMENT='用户等级信息表';

-- 3. 推荐奖励记录表
CREATE TABLE referral_rewards (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    referrer_address VARCHAR(42) NOT NULL COMMENT '推荐人地址',
    referee_address VARCHAR(42) NOT NULL COMMENT '被推荐人地址',
    stake_amount DECIMAL(36,18) NOT NULL COMMENT '质押金额（USDT等价值）',
    reward_amount DECIMAL(36,18) NOT NULL COMMENT '奖励金额',
    reward_rate INT NOT NULL COMMENT '奖励比例（基点，如300=3%）',
    referrer_level TINYINT NOT NULL COMMENT '推荐人等级',
    stake_type ENUM('USDT', 'RWA') NOT NULL COMMENT '质押类型',
    stake_id BIGINT COMMENT '质押ID',
    record_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
    settlement_status ENUM('PENDING', 'SETTLED', 'CANCELLED') DEFAULT 'PENDING' COMMENT '结算状态',
    settlement_time TIMESTAMP NULL COMMENT '结算时间',
    tx_hash VARCHAR(66) COMMENT '链上交易哈希',
    
    INDEX idx_referrer (referrer_address),
    INDEX idx_referee (referee_address),
    INDEX idx_status (settlement_status),
    INDEX idx_record_time (record_time)
) COMMENT='推荐奖励记录表';

-- 4. 每周结算批次表
CREATE TABLE settlement_batches (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_number VARCHAR(20) NOT NULL UNIQUE COMMENT '批次号（如：2026-W11）',
    start_time TIMESTAMP NOT NULL COMMENT '结算周期开始时间',
    end_time TIMESTAMP NOT NULL COMMENT '结算周期结束时间',
    total_rewards DECIMAL(36,18) DEFAULT 0 COMMENT '总奖励金额',
    total_records INT DEFAULT 0 COMMENT '总记录数',
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_batch (batch_number),
    INDEX idx_status (status)
) COMMENT='每周结算批次表';

-- 5. 用户推荐统计表
CREATE TABLE referral_statistics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_address VARCHAR(42) NOT NULL UNIQUE COMMENT '用户地址',
    total_referrals INT DEFAULT 0 COMMENT '总推荐人数',
    active_referrals INT DEFAULT 0 COMMENT '活跃推荐人数',
    total_rewards_earned DECIMAL(36,18) DEFAULT 0 COMMENT '累计获得奖励',
    pending_rewards DECIMAL(36,18) DEFAULT 0 COMMENT '待结算奖励',
    settled_rewards DECIMAL(36,18) DEFAULT 0 COMMENT '已结算奖励',
    last_reward_time TIMESTAMP NULL COMMENT '最后获得奖励时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_address)
) COMMENT='用户推荐统计表';

-- 6. 等级升级规则表
CREATE TABLE level_rules (
    level TINYINT PRIMARY KEY COMMENT '等级 (1-9)',
    reward_rate INT NOT NULL COMMENT '奖励比例（基点，如300=3%）',
    min_personal_stake DECIMAL(36,18) DEFAULT 0 COMMENT '最低个人质押要求',
    min_team_stake DECIMAL(36,18) DEFAULT 0 COMMENT '最低团队质押要求',
    min_direct_referrals INT DEFAULT 0 COMMENT '最低直推人数',
    description VARCHAR(200) COMMENT '等级描述'
) COMMENT='等级升级规则表';

-- 插入等级规则数据
INSERT INTO level_rules (level, reward_rate, description) VALUES
(1, 300, 'L1 - 3% 推荐奖励'),
(2, 500, 'L2 - 5% 推荐奖励'),
(3, 800, 'L3 - 8% 推荐奖励'),
(4, 1200, 'L4 - 12% 推荐奖励'),
(5, 1700, 'L5 - 17% 推荐奖励'),
(6, 2300, 'L6 - 23% 推荐奖励'),
(7, 3000, 'L7 - 30% 推荐奖励'),
(8, 3500, 'L8 - 35% 推荐奖励'),
(9, 4000, 'L9 - 40% 推荐奖励');

-- 9. 级差奖励记录表
CREATE TABLE differential_rewards (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    stake_id BIGINT NOT NULL COMMENT '质押ID',
    staker_address VARCHAR(42) NOT NULL COMMENT '质押人地址',
    beneficiary_address VARCHAR(42) NOT NULL COMMENT '受益人地址',
    stake_amount DECIMAL(36,18) NOT NULL COMMENT '质押金额',
    beneficiary_level TINYINT NOT NULL COMMENT '受益人等级(V1-V5)',
    level_rate INT NOT NULL COMMENT '等级比例（基点，如500=5%）',
    max_distributed_rate INT NOT NULL COMMENT '路径已分配最高比例',
    reward_amount DECIMAL(36,18) NOT NULL COMMENT '奖励金额',
    depth INT NOT NULL COMMENT '层级深度（1=直推）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tx_hash VARCHAR(66) COMMENT '交易哈希',
    status ENUM('PENDING', 'PAID', 'FAILED') DEFAULT 'PENDING',
    
    INDEX idx_stake (stake_id),
    INDEX idx_beneficiary (beneficiary_address),
    INDEX idx_staker (staker_address),
    INDEX idx_status (status)
) COMMENT='级差奖励记录表';

-- 7. 团队层级关系表（用于快速查询团队结构）
CREATE TABLE team_hierarchy (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ancestor_address VARCHAR(42) NOT NULL COMMENT '上级地址',
    descendant_address VARCHAR(42) NOT NULL COMMENT '下级地址',
    depth INT NOT NULL COMMENT '层级深度（1=直推，2=二级...）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_hierarchy (ancestor_address, descendant_address),
    INDEX idx_ancestor (ancestor_address, depth),
    INDEX idx_descendant (descendant_address)
) COMMENT='团队层级关系表（闭包表）';

-- 8. 等级变更日志表
CREATE TABLE level_change_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_address VARCHAR(42) NOT NULL COMMENT '用户地址',
    old_level TINYINT NOT NULL COMMENT '原等级',
    new_level TINYINT NOT NULL COMMENT '新等级',
    change_reason VARCHAR(200) COMMENT '变更原因',
    change_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_address),
    INDEX idx_time (change_time)
) COMMENT='等级变更日志表';

