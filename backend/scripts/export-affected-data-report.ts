/**
 * 导出「balance_snapshots 重复 / stake_events 对账」受影响数据清单（JSON）。
 *
 * 用法：
 *   cd backend && npx ts-node --transpile-only scripts/export-affected-data-report.ts
 *   OUT=./reports/out.json npx ts-node --transpile-only scripts/export-affected-data-report.ts
 */
import dotenv from 'dotenv';
import fs from 'fs';
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
  const outPath = process.env.OUT || path.join(__dirname, '../reports/affected-data-snapshot-dup.json');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const [dupGroups] = await conn.query<RowDataPacket[]>(`
    SELECT LOWER(user_address) AS user_address, asset_type, tx_hash, balance_type, event_type, COUNT(*) AS duplicate_rows
    FROM balance_snapshots
    WHERE tx_hash IS NOT NULL AND TRIM(tx_hash) != ''
      AND event_type = 'stake'
    GROUP BY LOWER(user_address), asset_type, tx_hash, balance_type, event_type
    HAVING COUNT(*) > 1
    ORDER BY duplicate_rows DESC, user_address
  `);

  const [dupUserRows] = await conn.query<RowDataPacket[]>(`
    SELECT COUNT(DISTINCT ua) AS cnt FROM (
      SELECT LOWER(b1.user_address) AS ua
      FROM balance_snapshots b1
      INNER JOIN balance_snapshots b2
        ON LOWER(b1.user_address) = LOWER(b2.user_address)
       AND b1.asset_type = b2.asset_type
       AND b1.tx_hash = b2.tx_hash
       AND b1.balance_type = b2.balance_type
       AND b1.event_type = b2.event_type
       AND b1.tx_hash IS NOT NULL AND TRIM(b1.tx_hash) != ''
       AND b1.id < b2.id
    ) x
  `);
  const dupUsers = dupUserRows[0] as { cnt: number };

  const [missing] = await conn.query<RowDataPacket[]>(`
    SELECT se.id, se.event_type, LOWER(se.user_address) AS user_address, se.stake_id, se.tx_hash, se.amount, se.lock_period, se.timestamp
    FROM stake_events se
    LEFT JOIN balance_snapshots bs ON ${JOIN_BS}
    WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
    GROUP BY se.id
    HAVING COUNT(bs.id) = 0
  `);

  const [dupStake] = await conn.query<RowDataPacket[]>(`
    SELECT se.id, se.event_type, LOWER(se.user_address) AS user_address, se.stake_id, se.tx_hash, COUNT(bs.id) AS snapshot_count
    FROM stake_events se
    LEFT JOIN balance_snapshots bs ON ${JOIN_BS}
    WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
    GROUP BY se.id, se.event_type, se.user_address, se.stake_id, se.tx_hash
    HAVING COUNT(bs.id) > 1
    ORDER BY snapshot_count DESC, se.id
  `);

  const [extraRows] = await conn.query<RowDataPacket[]>(`
    SELECT COALESCE(SUM(cnt - 1), 0) AS extra_rows FROM (
      SELECT COUNT(*) AS cnt FROM balance_snapshots
      WHERE tx_hash IS NOT NULL AND TRIM(tx_hash) != ''
      GROUP BY LOWER(user_address), asset_type, event_type, balance_type, tx_hash
      HAVING cnt > 1
    ) t
  `);
  const extra = extraRows[0] as { extra_rows: number };

  const [dupUserList] = await conn.query<RowDataPacket[]>(`
    SELECT DISTINCT LOWER(b1.user_address) AS user_address
    FROM balance_snapshots b1
    INNER JOIN balance_snapshots b2
      ON LOWER(b1.user_address) = LOWER(b2.user_address)
     AND b1.asset_type = b2.asset_type
     AND b1.tx_hash = b2.tx_hash
     AND b1.balance_type = b2.balance_type
     AND b1.event_type = b2.event_type
     AND b1.tx_hash IS NOT NULL AND TRIM(b1.tx_hash) != ''
     AND b1.id < b2.id
    ORDER BY user_address
  `);

  await conn.end();

  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      duplicate_stake_tx_groups: dupGroups.length,
      distinct_users_affected: dupUsers.cnt,
      extra_snapshot_rows_to_delete_with_tx: Number(extra.extra_rows),
      stake_events_missing_snapshot: missing.length,
      stake_events_with_duplicate_snapshots: dupStake.length,
    },
    duplicate_groups_all: dupGroups,
    affected_user_addresses: dupUserList.map((r) => String(r.user_address)),
    missing_stake_events: missing,
    stake_events_duplicate_snapshot_list: dupStake,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('Written:', path.resolve(outPath));
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
