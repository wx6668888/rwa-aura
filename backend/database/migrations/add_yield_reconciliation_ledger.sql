-- 质押账本重算收益 vs yield_settlements 汇总（全库批量脚本写入）
-- 执行：mysql ... < add_yield_reconciliation_ledger.sql
-- 或由 batch-reconcile-yield-ledger-persist.ts 内 CREATE TABLE IF NOT EXISTS 自动创建

CREATE TABLE IF NOT EXISTS yield_reconciliation_ledger (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_address VARCHAR(42) NOT NULL,
  asset_type ENUM('RWA', 'USDT') NOT NULL,
  stake_events_count INT NOT NULL DEFAULT 0,
  outflow_snapshots_count INT NOT NULL DEFAULT 0,
  ledger_snapshots_after_dedupe INT NOT NULL DEFAULT 0,
  settlement_rows INT NOT NULL DEFAULT 0,
  sum_paid_wei VARCHAR(80) NOT NULL,
  sum_expected_ledger_wei VARCHAR(80) NOT NULL,
  delta_paid_minus_expected_wei VARCHAR(80) NOT NULL COMMENT 'sum_paid - sum_expected；正数表示相对账本多记',
  sum_paid_rwa_display VARCHAR(64) DEFAULT NULL,
  sum_expected_rwa_display VARCHAR(64) DEFAULT NULL,
  computed_at BIGINT NOT NULL COMMENT 'unix 秒',
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_asset (user_address, asset_type),
  KEY idx_computed_at (computed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
