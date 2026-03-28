/**
 * 日结覆盖审计：users / stake_events / balance_snapshots 人数对比
 * 用法: cd backend && npx ts-node scripts/audit-settlement-coverage.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const q = async <T>(sql: string, params?: unknown[]): Promise<T> => {
    const [rows] = await conn.query(sql, params);
    return rows as T;
  };

  console.log('--- stake_events ---');
  const se = await q<Array<{ c: number }>>('SELECT COUNT(*) AS c FROM stake_events');
  console.log('rows:', se[0]?.c);
  const seBy = await q<Array<{ event_type: string; u: number }>>(
    `SELECT event_type, COUNT(DISTINCT user_address) AS u FROM stake_events GROUP BY event_type`
  );
  console.table(seBy);

  console.log('\n--- balance_snapshots（日结 db 模式主要依赖）---');
  const bs = await q<Array<{ asset_type: string; u: number }>>(
    `SELECT asset_type, COUNT(DISTINCT user_address) AS u FROM balance_snapshots GROUP BY asset_type`
  );
  console.table(bs);

  console.log('\n--- users 表有地址 ---');
  const usersWithAddress = await q<Array<{ c: number }>>(
    `SELECT COUNT(*) AS c FROM users WHERE address IS NOT NULL AND address != ''`
  );
  console.log('count:', usersWithAddress[0]?.c ?? 0);

  console.log(
    '\n若 balance_snapshots 人数远小于 stake_events：先跑 scripts/backfill-balance-snapshots-from-stake-events.ts 再日结。'
  );
  console.log('仅链上 USDT 质押且库无事件时：需 Archive RPC + STAKING_DEPLOY_BLOCK 用 chain 日结，或保证 EventMonitor 写入 USDT 事件。\n');

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
