/**
 * 去重 balance_snapshots（只删除完全相同的重复行）
 *
 * 去重键（完全匹配）：
 * - user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash
 *
 * 保留规则：
 * - 对每个去重键，保留 id 最小的那一行，其余全部删除
 *
 * 用法：
 *   cd backend && npx ts-node scripts/dedupe-balance-snapshots.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '../.env') });

const USER_TO_VERIFY = '0x06f0e0a0d72dd56fb75ab4f9b1146d8c7bda0ebe'.toLowerCase();
const TX_TO_VERIFY = '0xc63210b55825169d978e403f04b2ecc82e9d67868b0e609dab04d47eda2f3ff9';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'rwa_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rwa_protocol',
  });

  const q = async <T,>(sql: string, params?: unknown[]): Promise<T> => {
    const [rows] = await conn.query(sql, params as any);
    return rows as T;
  };

  console.log('--- 验证清理前 ---');
  const [before] = await q<
    any[]
  >(
    `SELECT COUNT(*) as c
     FROM balance_snapshots
     WHERE LOWER(user_address)=?
       AND asset_type='RWA'
       AND balance_type='locked_30'
       AND tx_hash=?
       AND timestamp=(SELECT timestamp FROM balance_snapshots WHERE LOWER(user_address)=? AND asset_type='RWA' AND balance_type='locked_30' AND tx_hash=? ORDER BY id DESC LIMIT 1)
    `,
    [USER_TO_VERIFY, TX_TO_VERIFY, USER_TO_VERIFY, TX_TO_VERIFY]
  );

  console.log(`locked_30 同 tx_hash 行数(预清理) = ${before?.c ?? 0}`);

  console.log('--- 开始全表去重 ---');

  // 删除规则：删掉每组重复中的“较大 id”，以保证保留最小 id
  // 使用 `<=>` 做 NULL-safe 等值比较
  const deleteSql = `
    DELETE bs1
    FROM balance_snapshots bs1
    JOIN balance_snapshots bs2
      ON bs1.user_address = bs2.user_address
     AND bs1.asset_type = bs2.asset_type
     AND bs1.balance_type = bs2.balance_type
     AND bs1.amount = bs2.amount
     AND bs1.timestamp = bs2.timestamp
     AND bs1.event_type = bs2.event_type
     AND bs1.lock_end_time <=> bs2.lock_end_time
     AND bs1.tx_hash <=> bs2.tx_hash
     AND bs1.id > bs2.id
  `;

  const [result] = await conn.query<any>(deleteSql);
  // mysql2 delete join 的返回结构在不同版本表现略有不同
  console.log('delete result:', result?.affectedRows ?? result?.['affectedRows'] ?? result);

  console.log('--- 验证清理后 ---');
  const [after] = await q<
    any[]
  >(
    `SELECT COUNT(*) as c
     FROM balance_snapshots
     WHERE LOWER(user_address)=?
       AND asset_type='RWA'
       AND balance_type='locked_30'
       AND tx_hash=?
       AND timestamp=(SELECT timestamp FROM balance_snapshots WHERE LOWER(user_address)=? AND asset_type='RWA' AND balance_type='locked_30' AND tx_hash=? ORDER BY id DESC LIMIT 1)
    `,
    [USER_TO_VERIFY, TX_TO_VERIFY, USER_TO_VERIFY, TX_TO_VERIFY]
  );

  console.log(`locked_30 同 tx_hash 行数(清理后) = ${after?.c ?? 0}`);

  await conn.end();
  console.log('✅ balance_snapshots 去重完成');
}

main().catch((e) => {
  console.error('❌ 去重失败:', e);
  process.exit(1);
});

