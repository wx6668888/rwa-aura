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
  
  const addr = '0x8FAeD11E28903d652f4e32d93495cfD01c18E84e';
  
  const [rows] = await conn.query(`
    SELECT event_type, CAST(amount AS DECIMAL(38,0)) as amount, referrer_address, timestamp, tx_hash 
    FROM stake_events 
    WHERE LOWER(user_address) = LOWER(?) 
    ORDER BY timestamp DESC 
    LIMIT 5
  `, [addr]);
  
  console.log('=== 测试账号最新质押记录 ===');
  rows.forEach(r => {
    const amt = Number(r.amount) / 1e18;
    const date = new Date(Number(r.timestamp) * 1000).toLocaleString('zh-CN');
    console.log(`${r.event_type} ${amt.toFixed(2)} | 推荐人: ${r.referrer_address} | ${date} | tx: ${r.tx_hash.substring(0,10)}`);
  });
  
  await conn.end();
})();
