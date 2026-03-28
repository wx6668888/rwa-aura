const mysql = require('mysql2/promise');

const RWA_PRICE = 0.85;

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'rwa_protocol_v2',
    password: 'wuxi3211',
    database: 'rwa_protocol_v2'
  });
  
  // 递归计算团队总质押
  async function calculateTeamVolume(userAddress, visited = new Set()) {
    const address = userAddress.toLowerCase();
    if (visited.has(address)) return 0;
    visited.add(address);
    
    // 个人质押
    const [stakes] = await connection.execute(
      'SELECT SUM(amount) as total FROM locked_stakes WHERE LOWER(user_address) = ? AND is_withdrawn = 0',
      [address]
    );
    
    let total = stakes[0].total ? parseFloat(stakes[0].total) / 1e18 * RWA_PRICE : 0;
    
    // 递归所有下级
    const [refs] = await connection.execute(
      'SELECT user_address FROM referral_bindings WHERE LOWER(referrer_address) = ?',
      [address]
    );
    
    for (const ref of refs) {
      total += await calculateTeamVolume(ref.user_address, visited);
    }
    
    return total;
  }
  
  // 获取所有用户
  const [users] = await connection.execute(
    'SELECT DISTINCT user_address FROM locked_stakes WHERE is_withdrawn = 0'
  );
  
  console.log(`更新 ${users.length} 个用户...\n`);
  
  for (const { user_address } of users) {
    const teamVolume = await calculateTeamVolume(user_address);
    
    await connection.execute(
      `UPDATE user_stats SET team_volume_usdt = ?, team_retained_usdt = ? WHERE LOWER(user_address) = LOWER(?)`,
      [teamVolume, teamVolume, user_address]
    );
    
    console.log(`✅ ${user_address.substring(0,10)}... 团队: ${teamVolume.toFixed(2)} USDT`);
  }
  
  await connection.end();
  console.log('\n完成！');
}

main().catch(console.error);
