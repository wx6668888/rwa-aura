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
  
  // 今天的时间范围（Unix时间戳）
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const todayEnd = todayStart + 86400;
  
  console.log('=== 检查今日收益结算记录 ===');
  console.log('日期:', now.toLocaleDateString('zh-CN'));
  console.log('时间范围:', new Date(todayStart * 1000).toLocaleString('zh-CN'), '-', new Date(todayEnd * 1000).toLocaleString('zh-CN'));
  console.log('');
  
  // 查询今天的结算记录
  const [settlements] = await conn.query(
    `SELECT * FROM yield_settlements 
     WHERE settlement_time >= ? AND settlement_time < ?
     ORDER BY settlement_time DESC`,
    [todayStart, todayEnd]
  );
  
  if (settlements.length === 0) {
    console.log('❌ 今天没有任何结算记录！');
    console.log('说明：每日结算任务可能没有执行');
  } else {
    console.log(`✅ 找到 ${settlements.length} 条今日结算记录`);
    console.log('');
    settlements.forEach((s, i) => {
      const time = new Date(Number(s.settlement_time) * 1000);
      console.log(`记录 #${i + 1}:`);
      console.log(`  用户: ${s.user_address}`);
      console.log(`  资产类型: ${s.asset_type}`);
      console.log(`  收益金额: ${s.total_yield}`);
      console.log(`  结算时间: ${time.toLocaleString('zh-CN')}`);
      console.log(`  交易哈希: ${s.tx_hash || '无'}`);
      console.log('');
    });
  }
  
  await conn.end();
})();
