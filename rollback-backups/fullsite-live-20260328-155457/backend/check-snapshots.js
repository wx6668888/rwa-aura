const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });
  
  console.log('=== 检查 balance_snapshots 表 ===');
  
  const [count] = await conn.query('SELECT COUNT(*) as total FROM balance_snapshots');
  console.log('总记录数:', count[0].total);
  
  if (count[0].total === 0) {
    console.log('\n❌ balance_snapshots 表为空！');
    console.log('这就是为什么没有收益结算的原因。');
    console.log('EventMonitor 应该在检测到质押事件后写入快照。');
  } else {
    const [recent] = await conn.query('SELECT * FROM balance_snapshots ORDER BY timestamp DESC LIMIT 5');
    console.log('\n最近5条记录:');
    recent.forEach(r => {
      const date = new Date(Number(r.timestamp) * 1000);
      console.log(`  用户: ${r.user_address.substring(0,10)}...`);
      console.log(`  资产: ${r.asset_type} | 类型: ${r.balance_type}`);
      console.log(`  金额: ${r.amount}`);
      console.log(`  时间: ${date.toLocaleString('zh-CN')}`);
      console.log('');
    });
  }
  
  await conn.end();
})();
