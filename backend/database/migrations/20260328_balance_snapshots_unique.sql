-- 在 balance_snapshots 上增加逻辑唯一性（MySQL 无部分 UNIQUE，使用生成列）
--
-- 前置条件：先跑 backend/scripts/dedupe-balance-snapshots.ts，否则 ADD UNIQUE 会因重复失败
--
-- 键规则（与脚本 + BalanceSnapshotService 一致）：
-- - 有 tx_hash：LOWER(user) + asset + event + balance_type + tx_hash
-- - 无 tx_hash（mature 等）：LOWER(user) + asset + event + balance_type + timestamp + amount
--   同一秒内两笔相同金额的 mature 理论上可能误判为重复；若出现可改为引入 synthetic 列
--
-- 回滚（如需）：
--   ALTER TABLE balance_snapshots DROP INDEX uq_balance_snapshots_dedupe_key, DROP COLUMN bs_dedupe_key;

ALTER TABLE balance_snapshots
ADD COLUMN bs_dedupe_key VARCHAR(512) GENERATED ALWAYS AS (
  IF(
    `tx_hash` IS NOT NULL AND TRIM(`tx_hash`) != '',
    CONCAT(
      LOWER(`user_address`), '|',
      `asset_type`, '|',
      `event_type`, '|',
      `balance_type`, '|',
      `tx_hash`
    ),
    CONCAT(
      LOWER(`user_address`), '|',
      `asset_type`, '|',
      `event_type`, '|',
      `balance_type`, '|',
      CAST(`timestamp` AS CHAR), '|',
      CAST(`amount` AS CHAR)
    )
  )
) STORED,
ADD UNIQUE KEY uq_balance_snapshots_dedupe_key (bs_dedupe_key);
