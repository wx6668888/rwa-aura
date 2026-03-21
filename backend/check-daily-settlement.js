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
  
  const today = new Date().toISOString().split('T')[0];
  console.log('=== 检查今日收益结算记录 ===');
  console.log('日期:', today);
  console.log('');
  
  // 检查 yield_settlements 表是否存在
  const [tables] = await conn.query("SHOW TABLES LIKE 'yield_settlements'");
  
  if (tables.length === 0) {
    console.log('❌ yield_settlements 表不存在！');
    await conn.end();
    return;
  }
  
  // 查询今天的结算记录
  const [settlements] = await conn.query(
    `SELECT * FROM yield_settlements 
     WHERE DATE(settlement_date) = ? 
     ORDER BY created_at DESC`,
    [today]
  );
  
  if (settlements.length === 0) {
    console.log('❌ 今天没有任何结算记录！');
    console.log('说明：每日结算任务可能没有执行');
  } else {
    console.log(`✅ 找到 ${settlements.length} 条今日结算记录`);
    console.log('');
    settlements.forEach((s, i) => {
      console.log(`记录 #${i + 1}:`);
      console.log(`  用户: ${s.user_address}`);
      console.log(`  资产类型: ${s.asset_type}`);
      console.log(`  收益金额: ${s.yield_amount}`);
      console.log(`  状态: ${s.status}`);
      console.log('');
    });
  }
  
  await conn.end();
})();
