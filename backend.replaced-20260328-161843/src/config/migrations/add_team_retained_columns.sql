-- Migration: Add team_total_deposited, team_total_withdrawn and withdrawal_log for 总留存
-- Run once on existing DB: mysql -u rwa_user -p rwa_protocol < add_team_retained_columns.sql

USE rwa_protocol;

-- Add columns to users if missing (run each ALTER only if column does not exist)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'rwa_protocol' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'team_total_deposited');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN team_total_deposited DECIMAL(38, 0) DEFAULT 0 COMMENT ''Team total deposited for retained calc (18-bit USDT equiv)'' AFTER team_volume',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'rwa_protocol' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'team_total_withdrawn');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN team_total_withdrawn DECIMAL(38, 0) DEFAULT 0 COMMENT ''Team total withdrawn for retained calc (18-bit USDT equiv)'' AFTER team_total_deposited',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Withdrawal log table (idempotent)
CREATE TABLE IF NOT EXISTS withdrawal_log (
    tx_hash VARCHAR(66) PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    amount_usdt_equiv DECIMAL(38, 0) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Withdrawal tx log for team retained idempotency';

-- Stored procedures (drop and recreate so migration is idempotent)
DROP PROCEDURE IF EXISTS sp_update_team_deposited;
DELIMITER //
CREATE PROCEDURE sp_update_team_deposited(
    IN p_user_address VARCHAR(42),
    IN p_amount_usdt_equiv DECIMAL(38, 0)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    UPDATE users SET team_total_deposited = COALESCE(team_total_deposited, 0) + p_amount_usdt_equiv
    WHERE address IN (SELECT ancestor_address FROM referral_relations WHERE user_address = p_user_address);
    UPDATE users SET team_total_deposited = COALESCE(team_total_deposited, 0) + p_amount_usdt_equiv
    WHERE address = p_user_address;
    COMMIT;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_update_team_withdrawn;
DELIMITER //
CREATE PROCEDURE sp_update_team_withdrawn(
    IN p_user_address VARCHAR(42),
    IN p_amount_usdt_equiv DECIMAL(38, 0)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    UPDATE users SET team_total_withdrawn = COALESCE(team_total_withdrawn, 0) + p_amount_usdt_equiv
    WHERE address IN (SELECT ancestor_address FROM referral_relations WHERE user_address = p_user_address);
    UPDATE users SET team_total_withdrawn = COALESCE(team_total_withdrawn, 0) + p_amount_usdt_equiv
    WHERE address = p_user_address;
    COMMIT;
END //
DELIMITER ;
