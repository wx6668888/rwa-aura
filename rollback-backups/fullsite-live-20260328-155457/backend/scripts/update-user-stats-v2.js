const Database = require('better-sqlite3');
const path = require('path');

const RWA_PRICE = 0.85;
const dbPath = path.join(__dirname, '../database/events.db');
const db = new Database(dbPath);

// 递归计算团队总质押（包含所有下级）
function calculateTeamVolumeRecursive(userAddress, visited = new Set()) {
  const address = userAddress.toLowerCase();
  
  if (visited.has(address)) return 0;
  visited.add(address);
  
  // 计算个人质押
  const stakes = db.prepare(`
    SELECT event_type, SUM(CAST(amount AS REAL)) as total
    FROM stake_events
    WHERE LOWER(user_address) = ?
    GROUP BY event_type
  `).all(address);
  
  let total = 0;
  for (const s of stakes) {
    const amountUsdt = s.event_type === 'RWA_STAKE' 
      ? (s.total / 1e18) * RWA_PRICE 
      : s.total / 1e18;
    total += amountUsdt;
  }
  
  // 减去提现
  const withdrawals = db.prepare(`
    SELECT SUM(CAST(amount AS REAL)) as total
    FROM withdrawal_events
    WHERE LOWER(user_address) = ?
  `).get(address);
  
  if (withdrawals?.total) {
    total -= (withdrawals.total / 1e18) * RWA_PRICE;
  }
  
  total = Math.max(0, total);
  
  // 递归计算所有下级
  const referrals = db.prepare(`
    SELECT user_address
    FROM referral_bindings
    WHERE LOWER(referrer_address) = ?
  `).all(address);
  
  for (const ref of referrals) {
    total += calculateTeamVolumeRecursive(ref.user_address, visited);
  }
  
  return total;
}

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
  
  const personalWithdrawals = db.prepare(`
    SELECT SUM(CAST(amount AS REAL)) as total
    FROM withdrawal_events
    WHERE LOWER(user_address) = ?
  `).get(address);
  
  if (personalWithdrawals?.total) {
    personalTotalUsdt -= (personalWithdrawals.total / 1e18) * RWA_PRICE;
    personalTotalUsdt = Math.max(0, personalTotalUsdt);
  }
  
  // 2. 直推人数
  const directReferrals = db.prepare(`
    SELECT COUNT(*) as count FROM referral_bindings
    WHERE LOWER(referrer_address) = ?
  `).get(address).count;
  
  // 3. 递归计算团队总质押
  const teamVolumeUsdt = calculateTeamVolumeRecursive(userAddress);
  const teamRetainedUsdt = teamVolumeUsdt;
  
  // 4. 更新数据库
  db.prepare(`
    INSERT INTO user_stats (
      user_address, personal_usdt_staked, personal_rwa_staked, personal_total_usdt,
      direct_referrals, team_volume_usdt, team_retained_usdt, last_calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_address) DO UPDATE SET
      personal_usdt_staked = excluded.personal_usdt_staked,
      personal_rwa_staked = excluded.personal_rwa_staked,
      personal_total_usdt = excluded.personal_total_usdt,
      direct_referrals = excluded.direct_referrals,
      team_volume_usdt = excluded.team_volume_usdt,
      team_retained_usdt = excluded.team_retained_usdt,
      last_calculated_at = excluded.last_calculated_at
  `).run(userAddress, personalUsdtStaked, personalRwaStaked, personalTotalUsdt,
         directReferrals, teamVolumeUsdt, teamRetainedUsdt, Date.now());
}

// 更新所有用户
const allUsers = db.prepare(`
  SELECT DISTINCT user_address FROM locked_stakes
  UNION
  SELECT DISTINCT user_address FROM stake_events
`).all();

console.log(`更新 ${allUsers.length} 个用户...\n`);

for (const { user_address } of allUsers) {
  updateUserStats(user_address);
  console.log(`✅ ${user_address.substring(0,10)}...`);
}

db.close();
console.log('\n完成！');
