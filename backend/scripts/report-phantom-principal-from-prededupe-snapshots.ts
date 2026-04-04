/**
 * 【精确】重复本金（phantom principal）明细：每笔 stake_events 在去重前多出来的快照行所对应的金额。
 *
 * 前提：本地/服务器上已有一份 **去重前** 的 balance_snapshots 全量数据，导入到：
 *   - 同库表名默认：`balance_snapshots_prededupe`（结构同 balance_snapshots）
 *   - 或另一库：`OTHER_DB.balance_snapshots`（设 PREDEDUPE_DB）
 *
 * 导入示例（运维自行从 mysqldump 恢复）：
 *   CREATE TABLE balance_snapshots_prededupe LIKE balance_snapshots;
 *   mysql ... < balance_snapshots_before_YYYYMMDD.sql  # 或 INSERT 选择导入
 *
 * 用法：
 *   PREDEDUPE_TABLE=balance_snapshots_prededupe npx ts-node --transpile-only scripts/report-phantom-principal-from-prededupe-snapshots.ts
 *   OUT=./reports/phantom-report.json ...
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { ethers } from 'ethers';

dotenv.config({ path: path.join(__dirname, '../.env') });

const JOIN_PRED = `
  bs.tx_hash = se.tx_hash
  AND LOWER(bs.user_address) = LOWER(se.user_address)
  AND bs.asset_type = se.event_type
  AND bs.event_type = 'stake'
  AND bs.timestamp = se.timestamp
  AND bs.amount = se.amount
  AND bs.balance_type = IF(se.lock_period = 0, 'flexible', CONCAT('locked_', se.lock_period))
`;

async function main() {
  const dbName = process.env.DB_NAME || 'rwa_protocol';
  const predTable =
    process.env.PREDEDUPE_TABLE || 'balance_snapshots_prededupe';
  const predDb = (process.env.PREDEDUPE_DB || dbName).trim();
  const bsQualifier = `\`${predDb}\`.\`${predTable}\``;

  const outPath =
    process.env.OUT ||
    path.join(__dirname, '../reports/phantom-principal-prededupe.json');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  const [exists] = await conn.query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [predDb, predTable.replace(/`/g, '')]
  );
  if (!exists.length) {
    console.error(
      `❌ 未找到表 ${predDb}.${predTable}。\n` +
        `请先把「去重前」balance_snapshots 全量导入为该表后重跑。\n` +
        `当前线上库已去重，无法从此库推算每笔重复次数。`
    );
    process.exit(2);
  }

  const [perStake] = await conn.query<RowDataPacket[]>(
    `SELECT
       se.id AS stake_event_id,
       LOWER(se.user_address) AS user_address,
       se.event_type,
       se.stake_id,
       se.tx_hash,
       se.amount,
       se.lock_period,
       se.timestamp,
       COUNT(bs.id) AS snapshot_rows_prededupe,
       GREATEST(COUNT(bs.id) - 1, 0) AS extra_rows,
       (GREATEST(COUNT(bs.id) - 1, 0) * CAST(se.amount AS DECIMAL(38,0))) AS phantom_principal_wei
     FROM stake_events se
     LEFT JOIN ${bsQualifier} bs ON ${JOIN_PRED}
     WHERE se.amount > 0 AND se.event_type IN ('USDT','RWA')
     GROUP BY se.id, se.user_address, se.event_type, se.stake_id, se.tx_hash, se.amount, se.lock_period, se.timestamp`
  );

  const byUser = new Map<
    string,
    {
      user_address: string;
      phantom_principal_wei: bigint;
      stakes: typeof perStake;
    }
  >();

  let totalPhantom = 0n;
  for (const row of perStake) {
    const ua = String(row.user_address).toLowerCase();
    const ph = BigInt(String(row.phantom_principal_wei || '0'));
    totalPhantom += ph;
    if (!byUser.has(ua)) {
      byUser.set(ua, { user_address: ua, phantom_principal_wei: 0n, stakes: [] });
    }
    const u = byUser.get(ua)!;
    u.phantom_principal_wei += ph;
    u.stakes.push(row);
  }

  const usersArr = [...byUser.values()]
    .map((u) => ({
      user_address: u.user_address,
      phantom_principal_wei: u.phantom_principal_wei.toString(),
      phantom_principal_ether: ethers.formatEther(u.phantom_principal_wei),
      stake_rows: u.stakes.length,
    }))
    .sort((a, b) =>
      BigInt(b.phantom_principal_wei) > BigInt(a.phantom_principal_wei) ? 1 : -1
    );

  const report = {
    generated_at: new Date().toISOString(),
    prededupe_source: `${predDb}.${predTable}`,
    summary: {
      stake_events_rows: perStake.length,
      users_with_phantom_gt_0: usersArr.filter(
        (x) => BigInt(x.phantom_principal_wei) > 0n
      ).length,
      total_phantom_principal_wei: totalPhantom.toString(),
      total_phantom_principal_ether: ethers.formatEther(totalPhantom),
    },
    per_stake: perStake,
    per_user: usersArr,
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
