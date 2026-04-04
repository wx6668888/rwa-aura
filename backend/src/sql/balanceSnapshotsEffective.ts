/**
 * balance_snapshots 逻辑去重键与 dedupe-balance-snapshots.ts 一致（每组保留 MIN(id)）。
 * 用于管理端汇总等读路径，避免重复行把余额/仓位加多倍。
 */
export const BALANCE_SNAPSHOTS_EFFECTIVE_SUBQUERY = `
(
  SELECT bs.*
  FROM balance_snapshots bs
  INNER JOIN (
    SELECT MIN(id) AS id FROM balance_snapshots
    WHERE tx_hash IS NOT NULL AND TRIM(tx_hash) != ''
    GROUP BY LOWER(user_address), asset_type, event_type, balance_type, tx_hash
    UNION ALL
    SELECT MIN(id) AS id FROM balance_snapshots
    WHERE tx_hash IS NULL OR TRIM(IFNULL(tx_hash,'')) = ''
    GROUP BY LOWER(user_address), asset_type, balance_type, amount, \`timestamp\`, event_type, lock_end_time
  ) k ON bs.id = k.id
) AS bs
`;
