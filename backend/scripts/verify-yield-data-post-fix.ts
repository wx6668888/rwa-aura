/**
 * 修复后核验：stake_events↔balance_snapshots 1:1、唯一索引、抽样 user_stats
 *
 *   npx ts-node --transpile-only scripts/verify-yield-data-post-fix.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

dotenv.config({ path: path.join(__dirname, '../.env') });

const JOIN_BS = `
  bs.tx_hash = se.tx_hash
  AND LOWER(bs.user_address) = LOWER(se.user_address)
  AND bs.asset_type = se.event_type
  AND bs.event_type = 'stake'
  AND bs.timestamp = se.timestamp
  AND bs.amount = se.amount
  AND bs.balance_type = IF(se.lock_period = 0, 'flexible', CONCAT('locked_', se.lock_period))
`;

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const [bad] = await conn.query<RowDataPacket[]>(
    `SELECT snapshot_count, COUNT(*) AS n FROM (
       SELECT se.id, COUNT(bs.id) AS snapshot_count
       FROM stake_events se
       LEFT JOIN balance_snapshots bs ON ${JOIN_BS}
       WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
       GROUP BY se.id
     ) t GROUP BY snapshot_count`
  );

  const [uq] = await conn.query<RowDataPacket[]>(
    `SHOW INDEX FROM balance_snapshots WHERE Key_name = 'uq_balance_snapshots_dedupe_key'`
  );

  const [col] = await conn.query<RowDataPacket[]>(
    `SHOW COLUMNS FROM balance_snapshots LIKE 'bs_dedupe_key'`
  );

  const [ys] = await conn.query<RowDataPacket[]>(
    `SELECT user_address, asset_type, settlement_time, COUNT(*) AS c FROM yield_settlements
     GROUP BY user_address, asset_type, settlement_time HAVING c > 1 LIMIT 3`
  );

  console.log(
    JSON.stringify(
      {
        stake_snapshot_distribution_should_be_only_1: bad,
        balance_snapshots_unique_index: uq.length > 0,
        bs_dedupe_key_column: col.length > 0,
        yield_settlements_duplicate_groups_sample: ys,
      },
      null,
      2
    )
  );

  if (bad.length !== 1 || String(bad[0].snapshot_count) !== '1') {
    console.error('❌ 对账未通过：存在 snapshot_count != 1 的质押');
    process.exit(1);
  }
  if (!uq.length || !col.length) {
    console.error('❌ 缺少 bs_dedupe_key 或唯一索引');
    process.exit(1);
  }
  if (ys.length) {
    console.error('❌ yield_settlements 存在重复日结键');
    process.exit(1);
  }

  console.log('✅ verify-yield-data-post-fix: OK');
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
