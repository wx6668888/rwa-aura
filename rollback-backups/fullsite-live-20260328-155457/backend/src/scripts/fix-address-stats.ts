/**
 * 针对单个地址，从 stake_events / withdrawal_events 重新计算 users 表里的
 * - cumulative_personal_stake
 * - team_volume
 * - team_total_deposited
 * - team_total_withdrawn
 *
 * 目标：让 EffectiveLevelService / 直推奖励使用的等级与前端统一（统一使用事件表口径）。
 *
 * 使用方式（在 backend 目录下）：
 *   npx ts-node src/scripts/fix-address-stats.ts 0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638
 */

import { getPool } from '../config/database.config';

const RWA_PRICE_BPS = 85; // 1 RWA = 0.85 USDT
const UNIT_18 = BigInt('1000000000000000000');

async function main() {
  const rawAddress = process.argv[2];
  if (!rawAddress) {
    console.error('用法: npx ts-node src/scripts/fix-address-stats.ts <address>');
    process.exit(1);
  }

  const address = rawAddress.toLowerCase();
  const pool = getPool();

  console.log('\n=== 修复 users 统计字段（基于事件表） ===\n');
  console.log('地址:', address);

  // 1. 个人质押：从 stake_events 汇总自己 USDT / RWA
  const [myStakes] = await pool.query(
    `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) AS total
     FROM stake_events
     WHERE LOWER(user_address) = LOWER(?)
     GROUP BY event_type`,
    [address]
  ) as any[];

  let myUSDT = BigInt(0);
  let myRWA = BigInt(0);
  for (const row of myStakes as any[]) {
    const total = BigInt(row.total ?? '0');
    const type: string = row.event_type || '';
    if (type.includes('USDT')) myUSDT += total;
    else if (type.includes('RWA')) myRWA += total;
  }

  // 2. 下级地址列表（直推）
  const [referrals] = await pool.query(
    `SELECT DISTINCT user_address
     FROM referral_bindings
     WHERE LOWER(referrer_address) = LOWER(?)`,
    [address]
  ) as any[];

  const referralAddresses: string[] = (referrals as any[]).map(
    (r) => (r.user_address as string).toLowerCase()
  );

  // 3. 团队质押（不含自己）
  let teamUSDT = BigInt(0);
  let teamRWA = BigInt(0);
  if (referralAddresses.length > 0) {
    const placeholders = referralAddresses.map(() => '?').join(',');
    const [teamStakes] = await pool.query(
      `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) AS total
       FROM stake_events
       WHERE LOWER(user_address) IN (${placeholders})
       GROUP BY event_type`,
      referralAddresses
    ) as any[];

    for (const row of teamStakes as any[]) {
      const total = BigInt(row.total ?? '0');
      const type: string = row.event_type || '';
      if (type.includes('USDT')) teamUSDT += total;
      else if (type.includes('RWA')) teamRWA += total;
    }
  }

  // 4. 个人+团队提现（USDT/RWA 全部折成 USDT 等值，18 位精度）
  const [myWithdrawals] = await pool.query(
    `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) AS total
     FROM withdrawal_events
     WHERE LOWER(user_address) = LOWER(?)
     GROUP BY event_type`,
    [address]
  ) as any[];

  let myWithdrawUSDT = BigInt(0);
  let myWithdrawRWAequiv = BigInt(0);
  for (const row of myWithdrawals as any[]) {
    const total = BigInt(row.total ?? '0');
    const type: string = row.event_type || '';
    if (type.includes('USDT')) myWithdrawUSDT += total;
    else if (type.includes('RWA')) {
      // RWA 金额已经是 USDT 等值（18 位），无需再次 0.85，只保留为 USDT 等值
      myWithdrawRWAequiv += total;
    }
  }

  let teamWithdrawUSDT = BigInt(0);
  let teamWithdrawRWAequiv = BigInt(0);
  if (referralAddresses.length > 0) {
    const placeholders = referralAddresses.map(() => '?').join(',');
    const [teamWithdrawals] = await pool.query(
      `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) AS total
       FROM withdrawal_events
       WHERE LOWER(user_address) IN (${placeholders})
       GROUP BY event_type`,
      referralAddresses
    ) as any[];

    for (const row of teamWithdrawals as any[]) {
      const total = BigInt(row.total ?? '0');
      const type: string = row.event_type || '';
      if (type.includes('USDT')) teamWithdrawUSDT += total;
      else if (type.includes('RWA')) {
        teamWithdrawRWAequiv += total;
      }
    }
  }

  // 5. 统一换算成 USDT 等值（18 位精度）
  const myRWAinUSDT = (myRWA * BigInt(RWA_PRICE_BPS)) / BigInt(100);
  const teamRWAinUSDT = (teamRWA * BigInt(RWA_PRICE_BPS)) / BigInt(100);

  const personalTotalUSDT = myUSDT + myRWAinUSDT; // 18 位
  const teamVolumeUSDT = myUSDT + myRWAinUSDT + teamUSDT + teamRWAinUSDT; // 18 位

  const totalWithdrawUSDT =
    myWithdrawUSDT + myWithdrawRWAequiv + teamWithdrawUSDT + teamWithdrawRWAequiv; // 18 位

  // team_total_deposited / team_total_withdrawn 约定为 USDT 等值的 18 位整数
  const teamTotalDeposited = teamVolumeUSDT;
  const teamTotalWithdrawn = totalWithdrawUSDT;

  console.log('\n[重新计算结果(18位精度)]');
  console.log('personal_total_usdt (含RWA折算):', personalTotalUSDT.toString());
  console.log('team_volume_usdt (含自己+团队): ', teamVolumeUSDT.toString());
  console.log('team_total_deposited:          ', teamTotalDeposited.toString());
  console.log('team_total_withdrawn:          ', teamTotalWithdrawn.toString());

  // 6. 回写到 users 表
  console.log('\n开始更新 users 表...');
  await pool.query(
    `UPDATE users
     SET cumulative_personal_stake = ?,
         team_volume = ?,
         team_total_deposited = ?,
         team_total_withdrawn = ?
     WHERE LOWER(address) = LOWER(?)`,
    [
      personalTotalUSDT.toString(),
      teamVolumeUSDT.toString(),
      teamTotalDeposited.toString(),
      teamTotalWithdrawn.toString(),
      address,
    ]
  );

  console.log('✅ 更新完成。请现在重新触发一笔新质押来验证有效等级（L2/L3）是否正确。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

