const mysql = require('mysql2/promise');

const RWA_PRICE = 0.85;

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'rwa_protocol_v2',
    password: 'wuxi3211',
    database: 'rwa_protocol_v2'
  });
  
  // 递归计算团队总充值
  async function calculateTeamDeposit(userAddress, visited = new Set()) {
    const address = userAddress.toLowerCase();
    if (visited.has(address)) return 0;
    visited.add(address);
    
    // 个人总充值（所有质押记录）
    const [stakes] = await connection.execute(
      'SELECT SUM(amount) as total FROM stake_events WHERE LOWER(user_address) = ?',
      [address]
    );
    
    let deposit = stakes[0].total ? parseFloat(stakes[0].total) / 1e18 * RWA_PRICE : 0;
    
    // 递归所有下级
    const [refs] = await connection.execute(
      'SELECT user_address FROM referral_bindings WHERE LOWER(referrer_address) = ?',
      [address]
    );
    
    for (const ref of refs) {
      deposit += await calculateTeamDeposit(ref.user_address, visited);
    }
    
    return deposit;
  }
  
  // 递归计算团队总提现
  async function calculateTeamWithdraw(userAddress, visited = new Set()) {
    const address = userAddress.toLowerCase();
    if (visited.has(address)) return 0;
    visited.add(address);
    
    // 个人总提现
    const [withdrawals] = await connection.execute(
      'SELECT SUM(amount) as total FROM withdrawal_events WHERE LOWER(user_address) = ?',
      [address]
    );
    
    let withdraw = withdrawals[0].total ? parseFloat(withdrawals[0].total) / 1e18 * RWA_PRICE : 0;
    
    // 递归所有下级
    const [refs] = await connection.execute(
      'SELECT user_address FROM referral_bindings WHERE LOWER(referrer_address) = ?',
      [address]
    );
    
    for (const ref of refs) {
      withdraw += await calculateTeamWithdraw(ref.user_address, visited);
    }
    
    return withdraw;
  }
  
  // 获取所有用户
  const [users] = await connection.execute(
    'SELECT DISTINCT user_address FROM locked_stakes WHERE is_withdrawn = 0'
  );
  
  console.log(`更新 ${users.length} 个用户...\n`);
  
  for (const { user_address } of users) {
    const teamDeposit = await calculateTeamDeposit(user_address);
    const teamWithdraw = await calculateTeamWithdraw(user_address);
    const teamRetained = Math.max(0, teamDeposit - teamWithdraw);
    
    await connection.execute(
      `UPDATE user_stats SET team_volume_usdt = ?, team_retained_usdt = ? WHERE LOWER(user_address) = LOWER(?)`,
      [teamDeposit, teamRetained, user_address]
    );
    
    console.log(`✅ ${user_address.substring(0,10)}... 充值:${teamDeposit.toFixed(2)} 提现:${teamWithdraw.toFixed(2)} 留存:${teamRetained.toFixed(2)}`);
  }
  
  await connection.end();
  console.log('\n完成！');
}

main().catch(console.error);
