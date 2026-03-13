import Database from 'better-sqlite3';
import * as path from 'path';

const RWA_PRICE = 0.85;

export class UserStatsService {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  // 更新单个用户的统计数据
  updateUserStats(userAddress: string) {
    const address = userAddress.toLowerCase();
    
    // 1. 计算个人质押
    const personalStakes = this.db.prepare(`
      SELECT event_type, SUM(CAST(amount AS REAL)) as total
      FROM stake_events
      WHERE LOWER(user_address) = ?
      GROUP BY event_type
    `).all(address) as Array<{ event_type: string; total: number }>;
    
    let personalUsdtStaked = 0;
    let personalRwaStaked = 0;
    let personalTotalUsdt = 0;
    
    for (const s of personalStakes) {
      if (s.event_type === 'USDT_STAKE') {
        personalUsdtStaked = s.total;
        personalTotalUsdt += s.total / 1e18;
      } else {
        personalRwaStaked = s.total;
        personalTotalUsdt += (s.total / 1e18) * RWA_PRICE;
      }
    }
    
    // 减去个人提现
    const personalWithdrawals = this.db.prepare(`
      SELECT SUM(CAST(amount AS REAL)) as total
      FROM withdrawal_events
      WHERE LOWER(user_address) = ?
    `).get(address) as { total: number | null };
    
    if (personalWithdrawals?.total) {
      const withdrawnRwa = personalWithdrawals.total / 1e18;
      personalTotalUsdt -= withdrawnRwa * RWA_PRICE;
      personalTotalUsdt = Math.max(0, personalTotalUsdt);
    }
    
    // 2. 获取直推人数
    const referrals = this.db.prepare(`
      SELECT user_address
      FROM referral_bindings
      WHERE LOWER(referrer_address) = ?
    `).all(address) as Array<{ user_address: string }>;
    
    const directReferrals = referrals.length;
    
    // 3. 计算团队总质押（下级 + 自己）
    let teamVolumeUsdt = personalTotalUsdt;
    for (const ref of referrals) {
      const refStakes = this.db.prepare(`
        SELECT event_type, SUM(CAST(amount AS REAL)) as total
        FROM stake_events
        WHERE LOWER(user_address) = ?
        GROUP BY event_type
      `).all(ref.user_address) as Array<{ event_type: string; total: number }>;
      
      let refTotal = 0;
      for (const s of refStakes) {
        const amountUsdt = s.event_type === 'RWA_STAKE' 
          ? (s.total / 1e18) * RWA_PRICE 
          : s.total / 1e18;
        refTotal += amountUsdt;
      }
      
      // 减去下级提现
      const refWithdrawals = this.db.prepare(`
        SELECT SUM(CAST(amount AS REAL)) as total
        FROM withdrawal_events
        WHERE LOWER(user_address) = ?
      `).get(ref.user_address) as { total: number | null };
      
      if (refWithdrawals?.total) {
        refTotal -= (refWithdrawals.total / 1e18) * RWA_PRICE;
      }
      
      teamVolumeUsdt += Math.max(0, refTotal);
    }
    
    // 4. 总留存 = 团队总质押（已减去提现）
    const teamRetainedUsdt = teamVolumeUsdt;
    
    // 5. 插入或更新
    this.db.prepare(`
      INSERT INTO user_stats (
        user_address, personal_usdt_staked, personal_rwa_staked, personal_total_usdt,
        direct_referrals, team_volume_usdt, team_retained_usdt, last_calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_address) DO UPDATE SET
        personal_usdt_staked = excluded.personal_usdt_staked,
        personal_rwa_staked = excluded.personal_rwa_staked,
        personal_total_usdt = excluded.personal_total_usdt,
        direct_referrals = excluded.direct_referrals,
        team_volume_usdt = excluded.team_volume_usdt,
        team_retained_usdt = excluded.team_retained_usdt,
        last_calculated_at = excluded.last_calculated_at,
        updated_at = datetime('now')
    `).run(
      address,
      personalUsdtStaked.toString(),
      personalRwaStaked.toString(),
      personalTotalUsdt.toString(),
      directReferrals,
      teamVolumeUsdt.toString(),
      teamRetainedUsdt.toString()
    );
  }
  
  // 更新所有用户
  updateAllUsers() {
    const users = this.db.prepare(`
      SELECT DISTINCT user_address FROM stake_events
    `).all() as Array<{ user_address: string }>;
    
    console.log(`[UserStats] 开始更新 ${users.length} 个用户...`);
    for (const user of users) {
      this.updateUserStats(user.user_address);
    }
    console.log(`[UserStats] 更新完成！`);
  }
}

