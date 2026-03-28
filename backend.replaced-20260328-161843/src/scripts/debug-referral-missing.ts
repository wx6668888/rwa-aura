/**
 * 调试：检查某个推荐人/被推荐人的质押记录与推荐奖励记录是否缺失。
 *
 * 使用方式（在 backend 目录下）:
 *   npx ts-node src/scripts/debug-referral-missing.ts <referrer> <referee>
 *
 * 例子：
 *   npx ts-node src/scripts/debug-referral-missing.ts 0x8FAeD11E28903d652f4e32d93495cfD01c18E84e 0x0fc49964F76696abeD8c11C568c04A72aebDB15b
 */

import { getPool } from '../config/database.config';

async function main() {
  const referrer = process.argv[2];
  const referee = process.argv[3];

  if (!referrer || !referee) {
    console.error('用法: npx ts-node src/scripts/debug-referral-missing.ts <referrer> <referee>');
    process.exit(1);
  }

  const pool = getPool();
  const refLower = referrer.toLowerCase();
  const reeLower = referee.toLowerCase();

  console.log('\n=== 直推奖励调试 ===\n');
  console.log('Referrer:', refLower);
  console.log('Referee :', reeLower);

  // 1. 查被推荐人的 USDT 质押（30/90/180/365）
  const [stakes] = await pool.query(
    `SELECT stake_id, amount, lock_period, event_type, referrer_address, FROM_UNIXTIME(timestamp) AS ts
     FROM stake_events
     WHERE LOWER(user_address) = ? 
       AND event_type = 'USDT'
       AND lock_period >= 30
     ORDER BY timestamp ASC`,
    [reeLower],
  );

  console.log('\n[stake_events — 被推荐人 USDT 质押 lock>=30]');
  console.table(stakes as any[]);

  // 2. 查 referrer 对该 referee 的直推奖励记录
  const [rewards] = await pool.query(
    `SELECT id, stake_id, stake_amount, stake_type, referrer_address, referee_address,
            referrer_level, reward_rate, reward_amount, status, stake_time
     FROM direct_referral_rewards
     WHERE LOWER(referrer_address) = ?
       AND LOWER(referee_address)  = ?
     ORDER BY stake_time ASC`,
    [refLower, reeLower],
  );

  console.log('\n[direct_referral_rewards — 直推奖励记录]');
  console.table(rewards as any[]);

  // 3. 打印有哪些 stake_id 出现在质押里但不在奖励里
  const stakeIds = new Set<string>((stakes as any[]).map((s) => String(s.stake_id)));
  const rewardStakeIds = new Set<string>((rewards as any[]).map((r) => String(r.stake_id)));

  const missing: string[] = [];
  for (const id of stakeIds) {
    if (!rewardStakeIds.has(id)) missing.push(id);
  }

  console.log('\n[对比结果]');
  console.log('质押 stake_id 集合   :', Array.from(stakeIds).join(', ') || '(none)');
  console.log('奖励 stake_id 集合   :', Array.from(rewardStakeIds).join(', ') || '(none)');
  console.log('缺失奖励的 stake_id :', missing.length ? missing.join(', ') : '(none)');

  console.log('\n=== 调试结束 ===\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

