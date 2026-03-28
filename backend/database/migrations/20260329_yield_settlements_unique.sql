-- =============================================================================
-- yield_settlements：去重后加唯一索引，与 DailySettlementService 占位 INSERT 配合防重复链上发放
-- =============================================================================
-- 执行顺序：
--   1) npm run dedupe:yield-settlements（或 --dry-run 先查）
--   2) 再在本库执行本文件（可重复执行：索引已存在则跳过 ALTER）
--
-- 若唯一索引添加仍失败：说明仍有重复行，先跑 dedupe 脚本。

-- 规范化地址（可重复执行）
UPDATE yield_settlements SET user_address = LOWER(TRIM(user_address))
WHERE user_address <> LOWER(TRIM(user_address));

-- 删除同一用户+资产+结算日的重复行，保留 id 最小
DELETE y1 FROM yield_settlements y1
INNER JOIN yield_settlements y2
  ON LOWER(TRIM(y1.user_address)) = LOWER(TRIM(y2.user_address))
 AND y1.asset_type = y2.asset_type
 AND y1.settlement_time = y2.settlement_time
 AND y1.id > y2.id;

-- 唯一约束（仅当不存在时添加，便于迁移重复执行）
SET @idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'yield_settlements'
    AND index_name = 'uq_yield_user_asset_time'
);
SET @sql := IF(
  @idx = 0,
  'ALTER TABLE yield_settlements ADD UNIQUE KEY uq_yield_user_asset_time (user_address, asset_type, settlement_time)',
  'SELECT ''uq_yield_user_asset_time already exists'' AS migration_note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
