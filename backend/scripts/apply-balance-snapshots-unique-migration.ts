/**
 * 一键：先对 balance_snapshots 去重，再执行唯一索引迁移（与 BalanceSnapshotService / 读路径 dedupe 一致）。
 *
 * 用法（在服务器、有 DB 权限的环境）：
 *   cd backend && npx ts-node --transpile-only scripts/apply-balance-snapshots-unique-migration.ts
 *
 * 若列 bs_dedupe_key 或索引已存在，会跳过对应步骤。
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function columnExists(
  conn: mysql.Connection,
  db: string,
  table: string,
  col: string
): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [db, table, col]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function indexExists(
  conn: mysql.Connection,
  db: string,
  table: string,
  keyName: string
): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [db, table, keyName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  const dbName = process.env.DB_NAME || 'rwa_protocol';

  console.log('1/3 运行 dedupe-balance-snapshots.ts（删除重复行，保留每组 MIN(id)）…');
  execSync('npx ts-node --transpile-only scripts/dedupe-balance-snapshots.ts', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  try {
    const hasCol = await columnExists(conn, dbName, 'balance_snapshots', 'bs_dedupe_key');
    const hasIdx = await indexExists(conn, dbName, 'balance_snapshots', 'uq_balance_snapshots_dedupe_key');

    if (hasCol && hasIdx) {
      console.log('2-3/3 已存在 bs_dedupe_key 与 uq_balance_snapshots_dedupe_key，跳过迁移。');
      return;
    }

    const sqlPath = path.join(__dirname, '../database/migrations/20260328_balance_snapshots_unique.sql');
    const raw = fs.readFileSync(sqlPath, 'utf8');
    const sql = raw
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    console.log('2-3/3 执行 20260328_balance_snapshots_unique.sql …');
    await conn.query(sql);
    console.log('✅ 唯一索引迁移完成。此后重复 INSERT 将被数据库拒绝，应用层已捕获 ER_DUP_ENTRY。');
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('❌ 失败:', e);
  process.exit(1);
});
