/**
 * 以质押明细表 stake_events 为「金标准」，对账 balance_snapshots 中 stake 行是否一一对应。
 *
 * - stake_events：链上监听写入，UNIQUE(tx_hash, stake_id)，每笔质押一行。
 * - 期望：每笔有效质押恰有 1 条匹配的 balance_snapshots（同 tx、用户、资产、时间、金额、锁仓桶）。
 * - 若 COUNT > 1：重复快照（日结会多算本金）；COUNT = 0：缺快照。
 *
 * 用法：
 *   cd backend && npx ts-node --transpile-only scripts/audit-stake-events-vs-balance-snapshots.ts
 *   npx ts-node --transpile-only scripts/audit-stake-events-vs-balance-snapshots.ts --samples=20
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

dotenv.config({ path: path.join(__dirname, '../.env') });

const JOIN_BS_ON_STAKE_EVENT = `
  bs.tx_hash = se.tx_hash
  AND LOWER(bs.user_address) = LOWER(se.user_address)
  AND bs.asset_type = se.event_type
  AND bs.event_type = 'stake'
  AND bs.timestamp = se.timestamp
  AND bs.amount = se.amount
  AND bs.balance_type = IF(se.lock_period = 0, 'flexible', CONCAT('locked_', se.lock_period))
`;

function argInt(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = parseInt(process.argv[i + 1] ?? '', 10);
  return Number.isFinite(v) ? v : fallback;
}

async function main() {
  const samples = argInt('--samples', 15);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const [totRows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM stake_events WHERE amount > 0 AND event_type IN ('USDT','RWA')`
  );
  const tot = totRows[0] as { c: number };
  console.log('=== stake_events vs balance_snapshots（stake 行）全量对账 ===\n');
  console.log(`stake_events 有效质押笔数 (USDT/RWA, amount>0): ${tot?.c ?? 0}`);

  const [dist] = await conn.query<RowDataPacket[]>(
    `SELECT snapshot_count, COUNT(*) AS rows FROM (
       SELECT se.id, COUNT(bs.id) AS snapshot_count
       FROM stake_events se
       LEFT JOIN balance_snapshots bs ON ${JOIN_BS_ON_STAKE_EVENT}
       WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
       GROUP BY se.id
     ) t GROUP BY snapshot_count ORDER BY snapshot_count`
  );
  console.log('\n每笔质押匹配到的快照条数分布（理想全部为 1）:');
  console.table(dist);

  const [aggRows] = await conn.query<RowDataPacket[]>(
    `SELECT
       SUM(CASE WHEN snapshot_count = 1 THEN 1 ELSE 0 END) AS ok,
       SUM(CASE WHEN snapshot_count = 0 THEN 1 ELSE 0 END) AS missing,
       SUM(CASE WHEN snapshot_count > 1 THEN 1 ELSE 0 END) AS dup
     FROM (
       SELECT se.id, COUNT(bs.id) AS snapshot_count
       FROM stake_events se
       LEFT JOIN balance_snapshots bs ON ${JOIN_BS_ON_STAKE_EVENT}
       WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
       GROUP BY se.id
     ) x`
  );
  const agg = aggRows[0] as { ok: number; missing: number; dup: number };
  console.log('\n汇总:');
  console.log(`  恰好 1 条快照（正常）: ${agg?.ok ?? 0}`);
  console.log(`  0 条快照（缺失）    : ${agg?.missing ?? 0}`);
  console.log(`  >1 条快照（重复）   : ${agg?.dup ?? 0}`);

  const [missingRows] = await conn.query<RowDataPacket[]>(
    `SELECT se.id, se.event_type, se.user_address, se.stake_id, se.tx_hash, se.amount, se.lock_period, se.timestamp
     FROM stake_events se
     LEFT JOIN balance_snapshots bs ON ${JOIN_BS_ON_STAKE_EVENT}
     WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
     GROUP BY se.id
     HAVING COUNT(bs.id) = 0`
  );
  if (missingRows.length) {
    console.log('\n--- 缺失快照的 stake_events（应补快照或核对监听）---');
    console.table(missingRows);
  }

  const [dupRows] = await conn.query<RowDataPacket[]>(
    `SELECT se.id, se.event_type, se.user_address, se.stake_id, se.tx_hash, COUNT(bs.id) AS snapshot_count
     FROM stake_events se
     LEFT JOIN balance_snapshots bs ON ${JOIN_BS_ON_STAKE_EVENT}
     WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
     GROUP BY se.id, se.event_type, se.user_address, se.stake_id, se.tx_hash
     HAVING COUNT(bs.id) > 1
     ORDER BY snapshot_count DESC, se.id ASC
     LIMIT ${samples}`
  );
  if (dupRows.length) {
    console.log(`\n--- 重复快照样例（前 ${samples} 笔，按重复数降序）---`);
    console.table(dupRows);
  }

  const [orphanRows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM balance_snapshots bs
     WHERE bs.event_type = 'stake'
       AND bs.tx_hash IS NOT NULL AND TRIM(bs.tx_hash) != ''
       AND NOT EXISTS (
         SELECT 1 FROM stake_events se
         WHERE se.tx_hash = bs.tx_hash
           AND LOWER(se.user_address) = LOWER(bs.user_address)
           AND se.event_type = bs.asset_type
           AND se.timestamp = bs.timestamp
           AND se.amount = bs.amount
           AND IF(se.lock_period = 0, 'flexible', CONCAT('locked_', se.lock_period)) = bs.balance_type
       )`
  );
  const orphan = orphanRows[0] as { c: number };
  console.log(`\n无对应 stake_events 的 stake 快照（孤儿）条数: ${orphan?.c ?? 0}`);

  const [lsRows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM locked_stakes WHERE is_withdrawn = 0`
  );
  const [seLockRows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM stake_events WHERE lock_period > 0 AND amount > 0`
  );
  const ls = lsRows[0] as { c: number };
  const seLock = seLockRows[0] as { c: number };
  console.log('\n--- 辅助：locked_stakes 与带锁质押笔数 ---');
  console.log(`locked_stakes 未赎回行数: ${ls?.c ?? 0}`);
  console.log(`stake_events 中 lock_period>0 的笔数: ${seLock?.c ?? 0}`);

  console.log(
    '\n说明：重复快照请运行 dedupe-balance-snapshots.ts 后执行唯一索引迁移；缺失快照需检查 EventMonitor 是否漏写。'
  );

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
