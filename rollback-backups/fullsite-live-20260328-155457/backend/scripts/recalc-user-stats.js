// 重新计算所有用户的 user_stats 表
// 从 stake_events 和 withdrawal_events 表重新计算净质押（总质押 - 总提现）

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🔄 重新计算所有用户的质押数据...\n');

  // 获取所有用户
  const [users] = await conn.query('SELECT DISTINCT user_address FROM stake_events');
  
  for (const user of users) {
    const addr = user.user_address;
    
    // 计算总USDT质押
    const [usdtStakes] = await conn.query(
      'SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE user_address = ? AND event_type LIKE "%USDT%"',
      [addr]
    );
    
    // 计算总RWA质押
    const [rwaStakes] = await conn.query(
      'SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE user_address = ? AND event_type LIKE "%RWA%"',
      [addr]
    );
    
    // 计算USDT提现
    const [usdtWithdraws] = await conn.query(
      'SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE user_address = ? AND event_type LIKE "%USDT%"',
      [addr]
    );
    
    // 计算RWA提现（amount存储为USDT等值，需要转换）
    const [rwaWithdraws] = await conn.query(
      'SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE user_address = ? AND event_type LIKE "%RWA%"',
      [addr]
    );
    
    const totalUSDT = BigInt(usdtStakes[0]?.total || '0');
    const totalRWA = BigInt(rwaStakes[0]?.total || '0');
    const withdrawnUSDT = BigInt(usdtWithdraws[0]?.total || '0');
    const withdrawnRWAUSDT = BigInt(rwaWithdraws[0]?.total || '0');
    const withdrawnRWA = (withdrawnRWAUSDT * 100n) / 85n; // 转换回RWA
    
    // 计算净质押（总质押 - 总提现）
    const netUSDT = totalUSDT > withdrawnUSDT ? totalUSDT - withdrawnUSDT : 0n;
    const netRWA = totalRWA > withdrawnRWA ? totalRWA - withdrawnRWA : 0n;
    
    // 更新 user_stats
    await conn.query(
      `UPDATE user_stats 
       SET personal_usdt_staked = ?, 
           personal_rwa_staked = ?,
           updated_at = NOW()
       WHERE user_address = ?`,
      [netUSDT.toString(), netRWA.toString(), addr]
    );
    
    console.log(`✅ ${addr}: USDT=${Number(netUSDT)/1e18}, RWA=${Number(netRWA)/1e18}`);
  }
  
  console.log(`\n✅ 完成！更新了 ${users.length} 个用户`);
  await conn.end();
}

main().catch(console.error);
