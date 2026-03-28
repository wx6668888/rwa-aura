/**
 * 去重 balance_snapshots
 *
 * 1) 有 tx_hash 的行：每个 (LOWER(user_address), asset_type, event_type, balance_type, tx_hash) 只保留 id 最小的一条
 *    —— 与 BalanceSnapshotService 质押/提现防重键一致（提现侧 balance_type 恒为 flexible，不影响唯一性）
 * 2) tx_hash 为空或空串（多为 mature 或历史脏数据）：按整行业务字段去重，保留 id 最小
 *    —— (LOWER(user_address), asset_type, balance_type, amount, timestamp, event_type, lock_end_time) NULL-safe
 *
 * 用法：
 *   cd backend && npx ts-node scripts/dedupe-balance-snapshots.ts
 *   npx ts-node scripts/dedupe-balance-snapshots.ts --dry-run
 *   npx ts-node scripts/dedupe-balance-snapshots.ts --user=0xabc...
 *
 * 去重后若需防再次重复插入，可执行 database/migrations/20260328_balance_snapshots_unique.sql（须先跑本脚本）
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';

dotenv.config({ path: path.join(__dirname, '../.env') });

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  let userFilter: string | null = null;
  for (const a of process.argv) {
    if (a.startsWith('--user=')) {
      userFilter = a.slice('--user='.length).trim().toLowerCase();
      if (!userFilter.startsWith('0x')) userFilter = `0x${userFilter}`;
    }
  }
  return { dryRun, userFilter };
}

async function main() {
  const { dryRun, userFilter } = parseArgs();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const userJoinFilter = userFilter
    ? 'AND LOWER(bs1.user_address) = ? AND LOWER(bs2.user_address) = ?'
    : '';
  const userParamsDup = userFilter ? [userFilter, userFilter] : [];

  const q = async <T,>(sql: string, params?: unknown[]): Promise<T> => {
    const [rows] = await conn.query(sql, params as any);
    return rows as T;
  };

  // ---------- 统计将要删除的行数 ----------
  const countWithTxSql = `
    SELECT COALESCE(SUM(cnt - 1), 0) AS to_delete FROM (
      SELECT COUNT(*) AS cnt
      FROM balance_snapshots
      WHERE tx_hash IS NOT NULL AND TRIM(tx_hash) != ''
      ${userFilter ? 'AND LOWER(user_address) = ?' : ''}
      GROUP BY LOWER(user_address), asset_type, event_type, balance_type, tx_hash
      HAVING cnt > 1
    ) t
  `;
  const countNullTxSql = `
    SELECT COALESCE(SUM(cnt - 1), 0) AS to_delete FROM (
      SELECT COUNT(*) AS cnt
      FROM balance_snapshots
      WHERE tx_hash IS NULL OR TRIM(IFNULL(tx_hash,'')) = ''
      ${userFilter ? 'AND LOWER(user_address) = ?' : ''}
      GROUP BY LOWER(user_address), asset_type, balance_type, amount, timestamp, event_type, lock_end_time
      HAVING cnt > 1
    ) t
  `;

  const [withTxRow] = await q<Array<{ to_delete: string | number }>>(
    countWithTxSql,
    userFilter ? [userFilter] : []
  );
  const [nullTxRow] = await q<Array<{ to_delete: string | number }>>(
    countNullTxSql,
    userFilter ? [userFilter] : []
  );

  const nWithTx = Number(withTxRow?.to_delete ?? 0);
  const nNullTx = Number(nullTxRow?.to_delete ?? 0);

  console.log(
    `[dedupe-balance-snapshots] ${dryRun ? 'DRY-RUN' : 'LIVE'}${userFilter ? ` user=${userFilter}` : ' (全库)'}`
  );
  console.log(`  待删（有 tx_hash 分组）: ${nWithTx}`);
  console.log(`  待删（无 tx_hash 整行分组）: ${nNullTx}`);
  console.log(`  合计: ${nWithTx + nNullTx}`);

  if (dryRun) {
    await conn.end();
    console.log('✅ dry-run 结束，未执行 DELETE');
    return;
  }

  // ---------- DELETE：有 tx_hash ----------
  const deleteWithTx = `
    DELETE bs1
    FROM balance_snapshots bs1
    INNER JOIN balance_snapshots bs2
      ON LOWER(bs1.user_address) = LOWER(bs2.user_address)
     AND bs1.asset_type = bs2.asset_type
     AND bs1.event_type = bs2.event_type
     AND bs1.balance_type = bs2.balance_type
     AND bs1.tx_hash = bs2.tx_hash
     AND bs1.tx_hash IS NOT NULL
     AND TRIM(bs1.tx_hash) != ''
     AND bs1.id > bs2.id
     ${userJoinFilter}
  `;
  const [r1] = await conn.query(deleteWithTx, userParamsDup);
  const affected1 = (r1 as ResultSetHeader)?.affectedRows ?? 0;
  console.log(`  DELETE（有 tx_hash）affectedRows: ${affected1}`);

  // ---------- DELETE：无 tx_hash，整行匹配 ----------
  const deleteNullTx = `
    DELETE bs1
    FROM balance_snapshots bs1
    INNER JOIN balance_snapshots bs2
      ON LOWER(bs1.user_address) = LOWER(bs2.user_address)
     AND bs1.asset_type = bs2.asset_type
     AND bs1.balance_type = bs2.balance_type
     AND bs1.amount = bs2.amount
     AND bs1.timestamp = bs2.timestamp
     AND bs1.event_type = bs2.event_type
     AND bs1.lock_end_time <=> bs2.lock_end_time
     AND (bs1.tx_hash IS NULL OR TRIM(IFNULL(bs1.tx_hash,'')) = '')
     AND (bs2.tx_hash IS NULL OR TRIM(IFNULL(bs2.tx_hash,'')) = '')
     AND bs1.id > bs2.id
     ${userJoinFilter}
  `;
  const [r2] = await conn.query(deleteNullTx, userParamsDup);
  const affected2 = (r2 as ResultSetHeader)?.affectedRows ?? 0;
  console.log(`  DELETE（无 tx_hash）affectedRows: ${affected2}`);

  await conn.end();
  console.log('✅ balance_snapshots 去重完成');
}

main().catch((e) => {
  console.error('❌ 去重失败:', e);
  process.exit(1);
});
