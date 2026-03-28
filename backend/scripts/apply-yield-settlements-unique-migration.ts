/**
 * 对当前 .env 指向的库执行 database/migrations/20260329_yield_settlements_unique.sql
 * （幂等：索引已存在则跳过 ALTER）
 *
 * 前置：npm run dedupe:yield-settlements
 * 用法：cd backend && npm run migrate:yield-settlements-unique
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const sqlPath = path.join(__dirname, '../database/migrations/20260329_yield_settlements_unique.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  await c.query(sql);
  await c.end();
  console.log('✅ yield_settlements 唯一索引迁移已执行（或已存在已跳过）');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
