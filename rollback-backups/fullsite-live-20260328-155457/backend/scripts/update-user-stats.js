const Database = require('better-sqlite3');
const path = require('path');

const RWA_PRICE = 0.85;
const dbPath = path.join(__dirname, '../database/events.db');
const db = new Database(dbPath);

function updateUserStats(userAddress) {
  const address = userAddress.toLowerCase();
  
  // 1. 计算个人质押
  const personalStakes = db.prepare(`
    SELECT event_type, SUM(CAST(amount AS REAL)) as total
    FROM stake_events
    WHERE LOWER(user_address) = ?
    GROUP BY event_type
  `).all(address);
  
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
  const personalWithdrawals = db.prepare(`
    SELECT SUM(CAST(amount AS REAL)) as total
    FROM withdrawal_events
    WHERE LOWER(user_address) = ?
  `).get(address);
  
  if (personalWithdrawals?.total) {
    const withdrawnRwa = personalWithdrawals.total / 1e18;
    personalTotalUsdt -= withdrawnRwa * RWA_PRICE;
    personalTotalUsdt = Math.max(0, personalTotalUsdt);
  }
  
  // 2. 获取直推人数
  const referrals = db.prepare(`
    SELECT user_address
    FROM referral_bindings
    WHERE LOWER(referrer_address) = ?
  `).all(address);
  
  const directReferrals = referrals.length;
  
  // 3. 计算团队总质押
  let teamVolumeUsdt = personalTotalUsdt;
  for (const ref of referrals) {
    const refStakes = db.prepare(`
      SELECT event_type, SUM(CAST(amount AS REAL)) as total
      FROM stake_events
      WHERE LOWER(user_address) = ?
      GROUP BY event_type
    `).all(ref.user_address);
    
    let refTotal = 0;
    for (const s of refStakes) {
      const amountUsdt = s.event_type === 'RWA_STAKE' 
        ? (s.total / 1e18) * RWA_PRICE 
        : s.total / 1e18;
      refTotal += amountUsdt;
    }
    
    // 减去下级提现
    const refWithdrawals = db.prepare(`
      SELECT SUM(CAST(amount AS REAL)) as total
      FROM withdrawal_events
      WHERE LOWER(user_address) = ?
    `).get(ref.user_address);
    
    if (refWithdrawals?.total) {
      refTotal -= (refWithdrawals.total / 1e18) * RWA_PRICE;
    }
    
    teamVolumeUsdt += Math.max(0, refTotal);
  }
  
  // 4. 总留存 = 团队总质押（已减去提现）
  const teamRetainedUsdt = teamVolumeUsdt;
  
  // 5. 更新数据库
  db.prepare(`
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
  
  console.log(`✅ 用户 ${address} 数据已更新`);
  console.log(`   个人总质押: ${personalTotalUsdt.toFixed(2)} USDT`);
  console.log(`   团队总质押: ${teamVolumeUsdt.toFixed(2)} USDT`);
  console.log(`   总留存: ${teamRetainedUsdt.toFixed(2)} USDT`);
}

const address = process.argv[2] || '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
updateUserStats(address);
db.close();
