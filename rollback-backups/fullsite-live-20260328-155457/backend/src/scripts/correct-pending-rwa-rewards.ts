/**
 * 将已入库的 PENDING 且 stake_type=RWA 的推荐奖励按新规则回算：reward_amount *= 0.85（统一为 USDT）
 * 只执行一次即可。
 *
 * 使用：npx ts-node src/scripts/correct-pending-rwa-rewards.ts
 */

import { query, getPool } from '../config/database.config';

async function main() {
  const pool = getPool();

  const [rows] = await pool.query(
    `SELECT id, stake_id, reward_amount, referrer_address, referee_address FROM direct_referral_rewards WHERE status = 'PENDING' AND stake_type = 'RWA'`
  ) as [any[], unknown];

  if (!rows?.length) {
    console.log('[Correct] 没有需要修正的 PENDING RWA 记录');
    process.exit(0);
  }

  for (const r of rows) {
    const oldVal = parseFloat(r.reward_amount);
    const newVal = Math.round(oldVal * 0.85 * 1e18) / 1e18;
    await query(
      `UPDATE direct_referral_rewards SET reward_amount = ? WHERE id = ?`,
      [newVal.toFixed(18), r.id]
    );
    console.log(`[Correct] id=${r.id} stake_id=${r.stake_id} ${oldVal} -> ${newVal} USDT`);
  }

  console.log(`[Correct] 已修正 ${rows.length} 条 PENDING RWA 奖励`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
