-- 直推奖励系统表创建脚本
-- 请手动执行此脚本

-- 1. 连接MySQL
-- E:\Bin\mysql.exe -u root -p

-- 2. 选择或创建数据库
CREATE DATABASE IF NOT EXISTS rwa_protocol;
USE rwa_protocol;

-- 3. 创建直推奖励记录表
CREATE TABLE IF NOT EXISTS direct_referral_rewards (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    referrer_address VARCHAR(42) NOT NULL,
    referee_address VARCHAR(42) NOT NULL,
    stake_id BIGINT NOT NULL,
    stake_amount DECIMAL(36,18) NOT NULL,
    stake_type ENUM('USDT', 'RWA') NOT NULL,
    referrer_level TINYINT NOT NULL,
    reward_rate INT NOT NULL,
    reward_amount DECIMAL(36,18) NOT NULL,
    stake_time TIMESTAMP NOT NULL,
    maturity_time TIMESTAMP NOT NULL,
    status ENUM('PENDING', 'MATURED', 'PAID', 'CANCELLED') DEFAULT 'MATURED',
    paid_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_referrer (referrer_address),
    INDEX idx_referee (referee_address),
    INDEX idx_status (status),
    INDEX idx_stake (stake_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 创建结算批次表
CREATE TABLE IF NOT EXISTS referral_settlement_batches (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_number VARCHAR(20) NOT NULL UNIQUE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_rewards DECIMAL(36,18) DEFAULT 0,
    total_records INT DEFAULT 0,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_batch (batch_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'Tables created successfully!' as result;
