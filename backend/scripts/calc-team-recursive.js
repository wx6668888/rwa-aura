const Database = require('better-sqlite3');
const path = require('path');

const RWA_PRICE = 0.85;
const dbPath = path.join(__dirname, '../database/events.db');
const db = new Database(dbPath);

// 递归计算团队总质押
function calculateTeamVolume(userAddress, visited = new Set()) {
  const address = userAddress.toLowerCase();
  
  // 防止循环引用
  if (visited.has(address)) return 0;
  visited.add(address);
  
  // 1. 计算个人质押
  const personalStakes = db.prepare(`
    SELECT event_type, SUM(CAST(amount AS REAL)) as total
    FROM stake_events
    WHERE LOWER(user_address) = ?
    GROUP BY event_type
  `).all(address);
  
  let personalTotal = 0;
  for (const s of personalStakes) {
    const amountUsdt = s.event_type === 'RWA_STAKE' 
      ? (s.total / 1e18) * RWA_PRICE 
      : s.total / 1e18;
    personalTotal += amountUsdt;
  }
  
  // 减去个人提现
  const withdrawals = db.prepare(`
    SELECT SUM(CAST(amount AS REAL)) as total
    FROM withdrawal_events
    WHERE LOWER(user_address) = ?
  `).get(address);
  
  if (withdrawals?.total) {
    personalTotal -= (withdrawals.total / 1e18) * RWA_PRICE;
  }
  
  personalTotal = Math.max(0, personalTotal);
  
  // 2. 递归计算所有下级
  const referrals = db.prepare(`
    SELECT user_address
    FROM referral_bindings
    WHERE LOWER(referrer_address) = ?
  `).all(address);
  
  let teamTotal = personalTotal;
  for (const ref of referrals) {
    teamTotal += calculateTeamVolume(ref.user_address, visited);
  }
  
  return teamTotal;
}

console.log("=== 递归更新团队总质押 ===\n");

// 获取所有用户
const allUsers = db.prepare(`
  SELECT DISTINCT user_address FROM referral_bindings
  UNION
  SELECT DISTINCT referrer_address FROM referral_bindings
`).all();

console.log(`找到 ${allUsers.length} 个用户\n`);

for (const { user_address } of allUsers) {
  const teamVolume = calculateTeamVolume(user_address);
  console.log(`${user_address.substring(0,10)}... 团队: ${teamVolume.toFixed(2)} USDT`);
}

db.close();
