/**
 * 去重 yield_settlements：同一 (LOWER(user_address), asset_type, settlement_time) 只保留最小 id
 * 并可选将 user_address 规范为小写（便于唯一索引）
 *
 * 用法：cd backend && npx ts-node --transpile-only scripts/dedupe-yield-settlements.ts
 *       npx ts-node --transpile-only scripts/dedupe-yield-settlements.ts --dry-run
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

type PairsRow = RowDataPacket & { pairs: number };

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const [dupStat] = await conn.query<PairsRow[]>(`SELECT COUNT(*) AS pairs FROM (
       SELECT LOWER(TRIM(user_address)) AS u, asset_type, settlement_time, COUNT(*) AS c
       FROM yield_settlements
       GROUP BY LOWER(TRIM(user_address)), asset_type, settlement_time
       HAVING c > 1
     ) t`);

  const pairs = Number(dupStat[0]?.pairs ?? 0);
  console.log(`[dedupe-yield] 重复 (地址+资产+settlement_time) 组数: ${pairs}`);

  if (dryRun) {
    await conn.end();
    console.log('dry-run 结束');
    return;
  }

  const [del] = await conn.query(
    `DELETE y1 FROM yield_settlements y1
     INNER JOIN yield_settlements y2
       ON LOWER(TRIM(y1.user_address)) = LOWER(TRIM(y2.user_address))
      AND y1.asset_type = y2.asset_type
      AND y1.settlement_time = y2.settlement_time
      AND y1.id > y2.id`
  );
  const affected = (del as ResultSetHeader).affectedRows;
  console.log(`[dedupe-yield] 删除重复行数: ${affected}`);

  const [upd] = await conn.query(
    `UPDATE yield_settlements SET user_address = LOWER(TRIM(user_address)) WHERE user_address <> LOWER(TRIM(user_address))`
  );
  console.log(`[dedupe-yield] 规范化地址行数: ${(upd as ResultSetHeader).affectedRows}`);

  await conn.end();
  console.log('✅ 完成。请执行 database/migrations/20260329_yield_settlements_unique.sql 添加唯一索引');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
