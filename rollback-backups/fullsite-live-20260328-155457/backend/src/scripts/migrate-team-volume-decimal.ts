/**
 * 升级 users 表中与团队业绩/总留存相关的列到 DECIMAL(38,0)，避免将来再出现溢出。
 *
 * 受影响列：
 * - team_volume
 * - team_total_deposited
 * - team_total_withdrawn
 *
 * 使用方式（在 backend 目录）：
 *   npx ts-node src/scripts/migrate-team-volume-decimal.ts
 */

import { getPool } from '../config/database.config';

async function main() {
  const pool = getPool();
  console.log('\n=== 升级 users 表金额字段到 DECIMAL(38,0) ===\n');

  const alters = [
    "ALTER TABLE users MODIFY COLUMN team_volume DECIMAL(38,0) NOT NULL DEFAULT 0 COMMENT 'Team volume (18-dec USDT equiv)';",
    "ALTER TABLE users MODIFY COLUMN team_total_deposited DECIMAL(38,0) NOT NULL DEFAULT 0 COMMENT 'Team total deposited for retained calc (18-dec USDT equiv)';",
    "ALTER TABLE users MODIFY COLUMN team_total_withdrawn DECIMAL(38,0) NOT NULL DEFAULT 0 COMMENT 'Team total withdrawn for retained calc (18-dec USDT equiv)';",
  ];

  for (const sql of alters) {
    console.log('执行:', sql);
    await pool.query(sql);
  }

  console.log('\n✅ 字段类型升级完成。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

