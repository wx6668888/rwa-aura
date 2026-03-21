const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM rewards ORDER BY timestamp DESC LIMIT 10');
    
    if (rows.length > 0) {
      console.log(`✅ 找到 ${rows.length} 条记录：\n`);
      rows.forEach((r, i) => {
        console.log(`记录 ${i + 1}:`);
        console.log('  用户:', r.user_address);
        console.log('  类型:', r.reward_type);
        console.log('  代币:', r.token_type);
        console.log('  金额:', (parseFloat(r.amount) / 1e18).toFixed(4), 'RWA');
        console.log('  时间:', r.timestamp);
        console.log('');
      });
    } else {
      console.log('❌ rewards 表中没有任何记录');
    }
  } catch (err) {
    console.error('查询失败:', err.message);
  } finally {
    await connection.end();
  }
})();
