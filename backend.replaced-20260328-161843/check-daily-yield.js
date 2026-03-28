const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('=== 检查今天的收益发放记录 ===');
    console.log('日期:', today);
    console.log('');

    // 查询今天的奖励记录
    const [rewards] = await connection.execute(
      `SELECT * FROM reward_updates 
       WHERE DATE(timestamp) = ? 
       ORDER BY timestamp DESC`,
      [today]
    );

    if (rewards.length > 0) {
      console.log(`✅ 找到 ${rewards.length} 条今天的发放记录：`);
      rewards.forEach((r, i) => {
        console.log(`\n记录 ${i + 1}:`);
        console.log('  用户:', r.user_address);
        console.log('  RWA金额:', (parseFloat(r.rwa_amount) / 1e18).toFixed(4), 'RWA');
        console.log('  USDT金额:', (parseFloat(r.usdt_amount) / 1e18).toFixed(4), 'USDT');
        console.log('  时间:', new Date(r.timestamp * 1000).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}));
      });
    } else {
      console.log('❌ 今天还没有发放记录');
    }

    // 查询最近5次发放
    console.log('\n=== 最近5次发放记录 ===');
    const [latest] = await connection.execute(
      `SELECT * FROM reward_updates ORDER BY timestamp DESC LIMIT 5`
    );

    if (latest.length > 0) {
      latest.forEach((r, i) => {
        console.log(`\n记录 ${i + 1}:`);
        console.log('  用户:', r.user_address);
        console.log('  RWA:', (parseFloat(r.rwa_amount) / 1e18).toFixed(4), 'RWA');
        console.log('  时间:', new Date(r.timestamp * 1000).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}));
      });
    } else {
      console.log('数据库中没有任何发放记录');
    }

  } catch (err) {
    console.error('查询失败:', err.message);
  } finally {
    await connection.end();
  }
})();
