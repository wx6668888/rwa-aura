/**
 * 一键数据修复（快照去重 + 唯一索引 + 补缺失快照 + 链上 rwaPending 同步到 user_stats）
 *
 * 用法：
 *   cd backend && npx ts-node --transpile-only scripts/run-full-yield-data-remediation.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { RwaPendingSyncService } from '../src/services/RwaPendingSyncService';
import { closePool } from '../src/config/database.config';

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
  console.log('=== RWA 收益/快照数据修复流水线 ===\n');

  console.log('[1/4] apply-balance-snapshots-unique-migration（内含 dedupe + ALTER）…');
  execSync('npx ts-node --transpile-only scripts/apply-balance-snapshots-unique-migration.ts', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  try {
    console.log('\n[2/4] 补 stake_events.id=269 缺失快照（若仍缺失）…');
    const [miss] = await conn.query<RowDataPacket[]>(
      `SELECT se.id FROM stake_events se
       LEFT JOIN balance_snapshots bs ON ${JOIN_BS}
       WHERE se.id = 269 AND se.amount > 0
       GROUP BY se.id
       HAVING COUNT(bs.id) = 0`
    );
    if (miss.length > 0) {
      await conn.query(
        `INSERT INTO balance_snapshots (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
         SELECT LOWER(TRIM(user_address)), 'RWA', 'flexible', amount, timestamp, 'stake', NULL, tx_hash
         FROM stake_events WHERE id = 269`
      );
      console.log('✅ 已插入缺失快照 1 行');
    } else {
      console.log('✅ stake_events 269 已有匹配快照，跳过插入');
    }

    const [verify] = await conn.query<RowDataPacket[]>(
      `SELECT snapshot_count, COUNT(*) AS n FROM (
         SELECT se.id, COUNT(bs.id) AS snapshot_count
         FROM stake_events se
         LEFT JOIN balance_snapshots bs ON ${JOIN_BS}
         WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
         GROUP BY se.id
       ) t GROUP BY snapshot_count ORDER BY snapshot_count`
    );
    console.log('\n[3/4] 对账 stake_events ↔ 快照 分布:', verify);
  } finally {
    await conn.end();
  }

  console.log('\n[4/4] 从链上同步 rwaPending → user_stats（前端/withdraw 数据源）…');
  const sync = new RwaPendingSyncService();
  await sync.syncAllUsers();
  console.log('✅ rwaPending 全量同步完成');

  console.log('\n=== 全部完成 ===');
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(async () => {
    await closePool();
  });
