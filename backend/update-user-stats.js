const mysql = require('mysql2/promise');

async function updateUserStats() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'rwa_protocol_v2',
    password: 'wuxi3211',
    database: 'rwa_protocol_v2'
  });

  // 获取所有用户的实际质押数据
  const [stakes] = await connection.execute(`
    SELECT 
      user_address,
      SUM(CASE WHEN is_rwa_stake = 0 THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END) as usdt_total,
      SUM(CASE WHEN is_rwa_stake = 1 THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END) as rwa_total
    FROM locked_stakes
    WHERE is_withdrawn = 0
    GROUP BY user_address
  `);

  console.log(`找到 ${stakes.length} 个用户需要更新`);

  // 逐个更新
  for (const stake of stakes) {
    await connection.execute(`
      UPDATE user_stats 
      SET personal_usdt_staked = ?, 
          personal_rwa_staked = ?,
          updated_at = NOW()
      WHERE user_address = ?
    `, [stake.usdt_total, stake.rwa_total, stake.user_address]);
    
    console.log(`✅ 更新用户 ${stake.user_address}`);
  }

  await connection.end();
  console.log('\n✅ 所有用户统计已更新！');
}

updateUserStats().catch(console.error);
