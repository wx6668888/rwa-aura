const mysql = require('mysql2/promise');
require('dotenv').config();

async function rebuildBalanceSnapshots() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 检查需要重建的用户...');
    
    // 获取所有有stake_events但没有balance_snapshots的用户
    const [users] = await conn.query(`
      SELECT DISTINCT user_address 
      FROM stake_events 
      WHERE user_address NOT IN (SELECT DISTINCT user_address FROM balance_snapshots)
    `);
    
    console.log(`找到 ${users.length} 个用户需要重建balance_snapshots`);
    
    for (const user of users) {
      const userAddress = user.user_address;
      console.log(`\n处理用户: ${userAddress}`);
      
      // 获取该用户的所有stake_events
      const [stakes] = await conn.query(
        'SELECT * FROM stake_events WHERE user_address = ? ORDER BY timestamp',
        [userAddress]
      );
      
      console.log(`  找到 ${stakes.length} 条质押记录`);
      
      let created = 0;
      
      for (const stake of stakes) {
        // 转换event_type为asset_type
        let assetType = stake.event_type;
        if (assetType === 'RWA_STAKE') assetType = 'RWA';
        else if (assetType === 'USDT_STAKE') assetType = 'USDT';
        
        const amount = stake.amount;
        const timestamp = stake.timestamp;
        const lockPeriod = stake.lock_period || 0;
        
        // 确定balance_type
        let balanceType = 'flexible';
        if (lockPeriod === 30) balanceType = 'locked_30';
        else if (lockPeriod === 90) balanceType = 'locked_90';
        else if (lockPeriod === 180) balanceType = 'locked_180';
        else if (lockPeriod === 365) balanceType = 'locked_365';
        
        // 插入balance_snapshot
        await conn.query(`
          INSERT INTO balance_snapshots 
          (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time)
          VALUES (?, ?, ?, ?, ?, 'stake', ?)
        `, [
          userAddress,
          assetType,
          balanceType,
          amount,
          timestamp,
          lockPeriod > 0 ? timestamp + (lockPeriod * 86400) : null
        ]);
        
        created++;
      }
      
      console.log(`  ✅ 创建了 ${created} 条balance_snapshots记录`);
    }
    
    console.log('\n✅ 重建完成！');
    
  } catch (error) {
    console.error('❌ 重建失败:', error);
  } finally {
    await conn.end();
  }
}

rebuildBalanceSnapshots();
