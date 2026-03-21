/**
 * 查询 yield_settlements / rewards(daily_yield) 概况
 * 用法: cd backend && npx ts-node scripts/query-yield-stats.ts
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

  const q = async (label: string, sql: string) => {
    const [rows] = await conn.query(sql);
    console.log('\n---', label, '---');
    console.dir(rows, { depth: null });
  };

  await q('yield_settlements 总行数', 'SELECT COUNT(*) AS cnt FROM yield_settlements');
  await q('yield_settlements 最近 10 条', `
    SELECT id, user_address, asset_type, settlement_time,
           FROM_UNIXTIME(settlement_time) AS settlement_at_utc,
           total_yield, tx_hash IS NOT NULL AS has_tx
    FROM yield_settlements
    ORDER BY id DESC
    LIMIT 10
  `);
  await q('rewards 中 daily_yield 最近 10 条', `
    SELECT id, user_address, reward_type, token_type, amount, timestamp
    FROM rewards
    WHERE reward_type = 'daily_yield'
    ORDER BY id DESC
    LIMIT 10
  `);
  await q('balance_snapshots 有数据的用户数(按资产)', `
    SELECT asset_type, COUNT(DISTINCT user_address) AS users
    FROM balance_snapshots
    GROUP BY asset_type
  `);

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
