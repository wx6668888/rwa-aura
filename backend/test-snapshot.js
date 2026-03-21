const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'rwa_protocol'
  });

  try {
    console.log('✅ 数据库连接成功\n');
    
    // 测试：插入一条快照记录
    const testUser = '0xcd5b97505499b1575e481446384430bb159851b6';
    const now = Math.floor(Date.now() / 1000);
    
    await connection.query(`
      INSERT INTO balance_snapshots 
      (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time)
      VALUES (?, 'USDT', 'flexible', '1000000000000000000000', ?, 'stake', NULL)
    `, [testUser, now]);
    
    console.log('✅ 测试快照插入成功');
    console.log(`用户: ${testUser}`);
    console.log(`金额: 1000 USDT`);
    console.log(`时间: ${new Date(now * 1000).toLocaleString()}\n`);
    
    console.log('系统已就绪，等待定时任务运行...');
  } catch (err) {
    console.error('❌ 失败:', err.message);
  } finally {
    await connection.end();
  }
})();
