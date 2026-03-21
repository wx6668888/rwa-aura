/**
 * 从 stake_events 回填缺失的 direct_referral_rewards。
 * 适用于手工回填过 stake_events 或 EventMonitor 未及时处理时的补录。
 *
 * 使用方式（在 backend 目录下）:
 *   npx ts-node src/scripts/backfill-referral-rewards.ts
 *   npx ts-node src/scripts/backfill-referral-rewards.ts 0x08Ea66321c4dd47468c3aDc55d06c5De7129A292
 *
 * 不传参数时处理所有有推荐人且 lock_period >= 30 的质押；
 * 传一个地址时只处理该推荐人下属的缺失奖励。
 */

import { query, getPool } from '../config/database.config';
import { DirectReferralRewardService } from '../services/DirectReferralRewardService';

async function main() {
  const onlyReferrer = process.argv[2] ? process.argv[2].toLowerCase() : null;
  const pool = getPool();
  const service = new DirectReferralRewardService();

  // 查出所有有推荐人且锁仓>=30天的质押（与 EventMonitor 规则一致）
  const [rows] = await pool.query(
    `SELECT stake_id, user_address, amount, lock_period, event_type, referrer_address, timestamp
     FROM stake_events
     WHERE referrer_address IS NOT NULL AND TRIM(referrer_address) != ''
       AND lock_period >= 30
       AND event_type IN ('RWA', 'USDT', 'RWA_STAKE', 'USDT_STAKE')
     ORDER BY timestamp ASC`,
    []
  ) as [any[], unknown];

  const stakes = (rows || []).filter(
    (r) => !onlyReferrer || r.referrer_address?.toLowerCase() === onlyReferrer
  );

  console.log(`[Backfill] 符合条件的质押记录: ${stakes.length} 条${onlyReferrer ? ` (仅推荐人 ${onlyReferrer})` : ''}\n`);

  let added = 0;
  let skipped = 0;

  for (const s of stakes) {
    const stakeIdNum = Number(s.stake_id);
    if (Number.isNaN(stakeIdNum)) {
      console.warn(`[Backfill] 跳过无效 stake_id: ${s.stake_id}`);
      skipped++;
      continue;
    }

    const [existing] = await query(
      'SELECT id FROM direct_referral_rewards WHERE stake_id = ?',
      [stakeIdNum]
    ) as any[];

    if (existing?.length > 0) {
      skipped++;
      continue;
    }

    const referrer = String(s.referrer_address || '').toLowerCase();
    const referee = String(s.user_address || '').toLowerCase();
    const stakeType = (s.event_type || '').includes('RWA') ? 'RWA' : 'USDT';
    const stakeTime = new Date(Number(s.timestamp || 0) * 1000);
    const lockPeriod = Number(s.lock_period) || 30;

    try {
      await service.recordReferralReward(
        referrer,
        referee,
        stakeIdNum,
        String(s.amount || '0'),
        stakeType as 'USDT' | 'RWA',
        stakeTime,
        lockPeriod
      );
      added++;
      console.log(`[Backfill] 已补录: stake_id=${stakeIdNum}, ${referee.slice(0, 10)}... -> ${referrer.slice(0, 10)}..., ${stakeType}`);
    } catch (e: any) {
      console.error(`[Backfill] 补录失败 stake_id=${stakeIdNum}:`, e?.message || e);
    }
  }

  console.log(`\n[Backfill] 完成: 新增 ${added} 条, 跳过(已存在) ${skipped} 条`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
