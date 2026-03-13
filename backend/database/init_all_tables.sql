-- RWA Protocol Complete Database Schema
-- Execute this file to create all required tables

USE rwa_protocol;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  address VARCHAR(42) PRIMARY KEY,
  referrer_address VARCHAR(42),
  node_level TINYINT DEFAULT 1,
  total_stake DECIMAL(36,18) DEFAULT 0,
  team_volume DECIMAL(36,18) DEFAULT 0,
  created_at BIGINT,
  updated_at BIGINT,
  INDEX idx_referrer (referrer_address),
  INDEX idx_node_level (node_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Stake events
CREATE TABLE IF NOT EXISTS stake_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  referrer_address VARCHAR(42),
  stake_id BIGINT NOT NULL,
  timestamp BIGINT NOT NULL,
  lock_period INT NOT NULL,
  block_number BIGINT NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  INDEX idx_user (user_address),
  INDEX idx_referrer (referrer_address),
  INDEX idx_timestamp (timestamp),
  INDEX idx_stake_id (stake_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Withdrawal events
CREATE TABLE IF NOT EXISTS withdrawal_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  stake_id BIGINT NOT NULL,
  timestamp BIGINT NOT NULL,
  block_number BIGINT NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  INDEX idx_user (user_address),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Reward updates
CREATE TABLE IF NOT EXISTS reward_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  timestamp BIGINT NOT NULL,
  block_number BIGINT NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  INDEX idx_user (user_address),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Referral bindings
CREATE TABLE IF NOT EXISTS referral_bindings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  referrer_address VARCHAR(42) NOT NULL,
  timestamp BIGINT NOT NULL,
  UNIQUE KEY unique_user (user_address),
  INDEX idx_referrer (referrer_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Node level history
CREATE TABLE IF NOT EXISTS node_level_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  old_level TINYINT NOT NULL,
  new_level TINYINT NOT NULL,
  timestamp BIGINT NOT NULL,
  INDEX idx_user (user_address),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Daily settlements
CREATE TABLE IF NOT EXISTS daily_settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  settlement_date DATE NOT NULL,
  total_staked DECIMAL(36,18) NOT NULL,
  total_rewards DECIMAL(36,18) NOT NULL,
  user_count INT NOT NULL,
  timestamp BIGINT NOT NULL,
  UNIQUE KEY unique_date (settlement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Direct referral rewards
CREATE TABLE IF NOT EXISTS direct_referral_rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_address VARCHAR(42) NOT NULL,
  referee_address VARCHAR(42) NOT NULL,
  stake_id BIGINT NOT NULL,
  stake_amount DECIMAL(36,18) NOT NULL,
  reward_amount DECIMAL(36,18) NOT NULL,
  referrer_level TINYINT NOT NULL,
  reward_rate DECIMAL(5,2) NOT NULL,
  status ENUM('PENDING', 'MATURED', 'SETTLED') DEFAULT 'PENDING',
  created_at BIGINT NOT NULL,
  matured_at BIGINT,
  settled_at BIGINT,
  settlement_batch_id INT,
  INDEX idx_referrer (referrer_address),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Referral settlement batches
CREATE TABLE IF NOT EXISTS referral_settlement_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  settlement_date DATE NOT NULL,
  total_rewards DECIMAL(36,18) NOT NULL,
  reward_count INT NOT NULL,
  status ENUM('PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PROCESSING',
  created_at BIGINT NOT NULL,
  completed_at BIGINT,
  UNIQUE KEY unique_date (settlement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Event processing state
CREATE TABLE IF NOT EXISTS event_processing_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  last_processed_block BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert initial state if not exists
INSERT IGNORE INTO event_processing_state (id, last_processed_block, updated_at) 
VALUES (1, 0, UNIX_TIMESTAMP());
