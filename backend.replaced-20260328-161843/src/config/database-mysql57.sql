-- RWA Tokenization Protocol Database Schema
-- Version: 1.0 - MySQL 5.7 Compatible
-- Date: 2026-03-01
-- 
-- CRITICAL: All amount fields use DECIMAL(38, 0) to store 18-bit integers
-- This prevents precision loss in financial calculations

-- Create database
CREATE DATABASE IF NOT EXISTS rwa_protocol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rwa_protocol;

-- ============================================================================
-- Users Table
-- Stores user information, staking data, and node levels
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    address VARCHAR(42) PRIMARY KEY COMMENT 'User wallet address',
    referrer VARCHAR(42) DEFAULT NULL COMMENT 'Referrer address (immutable once set)',
    referral_path TEXT DEFAULT NULL COMMENT 'Referral chain path, format: ,A,B,C,',
    node_level TINYINT DEFAULT 1 COMMENT 'Node level (1-5)',
    total_staked DECIMAL(38, 0) DEFAULT 0 COMMENT 'Total staked amount (18-bit integer, current)',
    cumulative_personal_stake DECIMAL(38, 0) DEFAULT 0 COMMENT 'Cumulative personal stake for node level (18-bit, USDT equiv, only increases)',
    team_volume DECIMAL(38, 0) DEFAULT 0 COMMENT 'Team total volume (18-bit integer, incremental update)',
    rwa_pending DECIMAL(38, 0) DEFAULT 0 COMMENT 'Pending RWA tokens (18-bit integer)',
    usdt_rewards DECIMAL(38, 0) DEFAULT 0 COMMENT 'Dynamic USDT rewards (18-bit integer)',
    direct_referral_count INT DEFAULT 0 COMMENT 'Direct referral count',
    last_withdraw_time TIMESTAMP NULL DEFAULT NULL COMMENT 'Last withdrawal timestamp',
    first_stake_time TIMESTAMP NULL DEFAULT NULL COMMENT 'First stake timestamp',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether user has active principal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_referrer (referrer),
    INDEX idx_node_level (node_level),
    INDEX idx_referral_path (referral_path(100)),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User information and staking data';

-- ============================================================================
-- Department Volumes Table
-- Used for calculating large/small department volumes (大区小区)
-- ============================================================================
CREATE TABLE IF NOT EXISTS department_volumes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL COMMENT 'User address',
    direct_referral VARCHAR(42) NOT NULL COMMENT 'Direct referral address (department root)',
    department_volume DECIMAL(38, 0) DEFAULT 0 COMMENT 'Department volume (18-bit integer)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_user_department (user_address, direct_referral),
    INDEX idx_user (user_address),
    INDEX idx_direct_referral (direct_referral)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Department volumes for large/small department calculation';

-- ============================================================================
-- Stakes Table
-- Records all staking transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS stakes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Stake ID (matches contract stakeId)',
    user_address VARCHAR(42) NOT NULL COMMENT 'User address',
    amount DECIMAL(38, 0) NOT NULL COMMENT 'Stake amount (18-bit integer)',
    tx_hash VARCHAR(66) NOT NULL UNIQUE COMMENT 'Transaction hash (for idempotency)',
    block_number BIGINT NOT NULL COMMENT 'Block number',
    timestamp TIMESTAMP NOT NULL COMMENT 'Stake timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_address),
    INDEX idx_timestamp (timestamp),
    INDEX idx_block_number (block_number),
    INDEX idx_tx_hash (tx_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Staking transaction records';

-- ============================================================================
-- Rewards Table
-- Records all reward distributions (static and differential)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rewards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL COMMENT 'Beneficiary address',
    reward_type ENUM('static', 'differential') NOT NULL COMMENT 'Reward type',
    token_type ENUM('RWA', 'USDT') NOT NULL COMMENT 'Token type',
    amount DECIMAL(38, 0) NOT NULL COMMENT 'Reward amount (18-bit integer)',
    from_user VARCHAR(42) DEFAULT NULL COMMENT 'Source user (for differential rewards)',
    stake_id BIGINT DEFAULT NULL COMMENT 'Related stake ID',
    timestamp TIMESTAMP NOT NULL COMMENT 'Reward timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_address),
    INDEX idx_type (reward_type),
    INDEX idx_token (token_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_stake_id (stake_id),
    INDEX idx_from_user (from_user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reward distribution records';

-- ============================================================================
-- Node Level History Table
-- Records node level upgrade history
-- ============================================================================
CREATE TABLE IF NOT EXISTS node_level_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL COMMENT 'User address',
    old_level TINYINT NOT NULL COMMENT 'Old level',
    new_level TINYINT NOT NULL COMMENT 'New level',
    team_volume DECIMAL(38, 0) NOT NULL COMMENT 'Team volume at upgrade (18-bit integer)',
    direct_v_count INT NOT NULL COMMENT 'Qualified direct referral count',
    timestamp TIMESTAMP NOT NULL COMMENT 'Upgrade timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_address),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Node level upgrade history';

-- ============================================================================
-- Referral Relations Table (CRITICAL for performance)
-- Used for exact matching in differential reward queries
-- MUST NOT use LIKE fuzzy matching - use this table instead
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_relations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL COMMENT 'User address',
    ancestor_address VARCHAR(42) NOT NULL COMMENT 'Ancestor address (any level)',
    depth INT NOT NULL COMMENT 'Depth level (1=direct, 2=second level, etc.)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_user_ancestor (user_address, ancestor_address),
    INDEX idx_ancestor (ancestor_address),
    INDEX idx_user (user_address),
    INDEX idx_depth (depth),
    INDEX idx_user_depth (user_address, depth)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Referral relationships for exact matching (NO LIKE queries)';

-- ============================================================================
-- Event Processing State Table
-- Tracks the last processed block for event monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_processing_state (
    id INT PRIMARY KEY DEFAULT 1,
    last_processed_block BIGINT NOT NULL DEFAULT 0 COMMENT 'Last processed block number',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Event processing state for resumption';

-- Insert initial state
INSERT INTO event_processing_state (id, last_processed_block) VALUES (1, 0)
ON DUPLICATE KEY UPDATE last_processed_block = last_processed_block;

-- ============================================================================
-- System Configuration Table
-- Stores system-wide configuration parameters
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System configuration';

-- Insert default configurations
INSERT INTO system_config (config_key, config_value, description) VALUES
('confirmation_blocks', '12', 'Number of block confirmations before processing events'),
('max_reward_per_call', '10000000000000000000000', 'Maximum reward per call (18-bit integer, 10000 USDT)'),
('price_oracle_cache_ttl', '300', 'Price oracle cache TTL in seconds'),
('daily_yield_rate', '0.008', 'Daily static yield rate (0.8%)'),
('withdrawal_fee_rate', '0.05', 'Withdrawal fee rate (5%)'),
('withdrawal_cooldown', '86400', 'Withdrawal cooldown in seconds (24 hours)')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- ============================================================================
-- Views for Common Queries (MySQL 5.7 Compatible)
-- ============================================================================

-- Drop views if they exist (MySQL 5.7 compatible way)
DROP VIEW IF EXISTS v_user_summary;
DROP VIEW IF EXISTS v_department_summary;

-- View: User summary with referral count
CREATE VIEW v_user_summary AS
SELECT 
    u.address,
    u.referrer,
    u.node_level,
    u.total_staked,
    u.team_volume,
    u.rwa_pending,
    u.usdt_rewards,
    u.direct_referral_count,
    u.is_active,
    u.first_stake_time,
    u.last_withdraw_time,
    COUNT(DISTINCT rr.user_address) as total_referral_count,
    COUNT(DISTINCT CASE WHEN rr.depth = 1 THEN rr.user_address END) as direct_count_from_relations
FROM users u
LEFT JOIN referral_relations rr ON u.address = rr.ancestor_address
GROUP BY u.address;

-- View: Department volumes summary
CREATE VIEW v_department_summary AS
SELECT 
    user_address,
    COUNT(DISTINCT direct_referral) as department_count,
    MAX(department_volume) as max_department_volume,
    SUM(department_volume) as total_department_volume
FROM department_volumes
GROUP BY user_address;

-- ============================================================================
-- Stored Procedures
-- ============================================================================

DELIMITER //

-- Procedure: Build referral relations for a new user
DROP PROCEDURE IF EXISTS sp_build_referral_relations//
CREATE PROCEDURE sp_build_referral_relations(
    IN p_user_address VARCHAR(42),
    IN p_referrer_address VARCHAR(42)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Insert direct referral relationship (depth = 1)
    INSERT INTO referral_relations (user_address, ancestor_address, depth)
    VALUES (p_user_address, p_referrer_address, 1);
    
    -- Insert indirect referral relationships (depth > 1)
    INSERT INTO referral_relations (user_address, ancestor_address, depth)
    SELECT p_user_address, ancestor_address, depth + 1
    FROM referral_relations
    WHERE user_address = p_referrer_address;
    
    COMMIT;
END //

-- Procedure: Update team volume incrementally
DROP PROCEDURE IF EXISTS sp_update_team_volume//
CREATE PROCEDURE sp_update_team_volume(
    IN p_user_address VARCHAR(42),
    IN p_increment_amount DECIMAL(38, 0)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Update all ancestors' team volume
    UPDATE users
    SET team_volume = team_volume + p_increment_amount
    WHERE address IN (
        SELECT ancestor_address
        FROM referral_relations
        WHERE user_address = p_user_address
    );
    
    -- Update user's own team volume
    UPDATE users
    SET team_volume = team_volume + p_increment_amount
    WHERE address = p_user_address;
    
    COMMIT;
END //

DELIMITER ;

-- ============================================================================
-- Performance Optimization Notes
-- ============================================================================
-- 1. All amount fields use DECIMAL(38, 0) for 18-bit integer storage
-- 2. referral_relations table enables O(1) ancestor lookup (NO LIKE queries)
-- 3. Indexes on frequently queried columns (address, timestamp, etc.)
-- 4. Stored procedures for complex operations (atomic transactions)
-- 5. Views for common aggregations (reduce query complexity)
-- 
-- CRITICAL RULES:
-- - NEVER use LIKE queries on referral_path
-- - ALWAYS use referral_relations table for ancestor/descendant queries
-- - ALWAYS use transactions for multi-table updates
-- - ALWAYS use SELECT ... FOR UPDATE for concurrent operations
-- ============================================================================

-- MySQL 5.7 Compatibility Notes:
-- 1. Removed CREATE OR REPLACE VIEW (not supported in MySQL 5.7)
-- 2. Added DROP VIEW IF EXISTS before CREATE VIEW
-- 3. Added DROP PROCEDURE IF EXISTS before CREATE PROCEDURE
-- 4. All other features are fully compatible with MySQL 5.7
