/**
 * 从 stake_events 补全 balance_snapshots（INSERT IGNORE，与 routes/migrate.ts 逻辑一致）
 * 解决：有质押记录但无快照 → 日结 getActiveUsers 扫不到 → 无收益
 *
 * 用法: cd backend && npx ts-node scripts/backfill-balance-snapshots-from-stake-events.ts
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { query, closePool } from '../src/config/database.config';

async function main() {
  let usdt = 0;
  let rwa = 0;

  const usdtStakes = await query<
    Array<{ user_address: string; amount: string; lock_period: number; timestamp: number; tx_hash: string }>
  >(
    `SELECT user_address, amount, lock_period, timestamp, tx_hash
     FROM stake_events WHERE event_type = 'USDT' AND amount > 0
     ORDER BY timestamp ASC`
  );

  for (const stake of usdtStakes) {
    const balanceType = stake.lock_period === 0 ? 'flexible' : `locked_${stake.lock_period}`;
    const lockEndTime = stake.lock_period > 0 ? stake.timestamp + stake.lock_period * 86400 : null;
    await query(
      `INSERT IGNORE INTO balance_snapshots 
       (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
       VALUES (?, 'USDT', ?, ?, ?, 'stake', ?, ?)`,
      [stake.user_address.toLowerCase(), balanceType, stake.amount, stake.timestamp, lockEndTime, stake.tx_hash]
    );
    usdt++;
  }

  const rwaStakes = await query<
    Array<{ user_address: string; amount: string; lock_period: number; timestamp: number; tx_hash: string }>
  >(
    `SELECT user_address, amount, lock_period, timestamp, tx_hash
     FROM stake_events WHERE event_type = 'RWA' AND amount > 0
     ORDER BY timestamp ASC`
  );

  for (const stake of rwaStakes) {
    const balanceType = stake.lock_period === 0 ? 'flexible' : `locked_${stake.lock_period}`;
    const lockEndTime = stake.lock_period > 0 ? stake.timestamp + stake.lock_period * 86400 : null;
    await query(
      `INSERT IGNORE INTO balance_snapshots 
       (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
       VALUES (?, 'RWA', ?, ?, ?, 'stake', ?, ?)`,
      [stake.user_address.toLowerCase(), balanceType, stake.amount, stake.timestamp, lockEndTime, stake.tx_hash]
    );
    rwa++;
  }

  console.log(`✅ 已处理 stake_events 行: USDT=${usdt}, RWA=${rwa}（INSERT IGNORE，重复会自动跳过）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await closePool();
  });
