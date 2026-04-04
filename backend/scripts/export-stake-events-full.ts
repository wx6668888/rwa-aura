/**
 * 导出全部 stake_events（当前链上同步的质押明细，作为「正确本金」基准）。
 *
 *   npx ts-node --transpile-only scripts/export-stake-events-full.ts
 *   OUT=./reports/stake-events-full.json npx ts-node --transpile-only scripts/export-stake-events-full.ts
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const outPath =
    process.env.OUT ||
    path.join(__dirname, '../reports/stake-events-full.json');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id, event_type, user_address, stake_id, amount, lock_period, timestamp, tx_hash, block_number
     FROM stake_events
     WHERE amount > 0 AND event_type IN ('USDT','RWA')
     ORDER BY id ASC`
  );
  await conn.end();

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ count: rows.length, rows }, null, 2), 'utf8');
  console.log('Written:', path.resolve(outPath), 'count=', rows.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
