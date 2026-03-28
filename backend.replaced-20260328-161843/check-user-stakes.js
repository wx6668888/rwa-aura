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
  
  const addr = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  const [rows] = await conn.query(`
    SELECT event_type, CAST(amount AS DECIMAL(38,0)) as amount, lock_period, timestamp
    FROM stake_events 
    WHERE LOWER(user_address) = LOWER(?) 
    AND event_type LIKE '%USDT%'
    ORDER BY timestamp
  `, [addr]);
  
  console.log('=== 该用户所有USDT质押记录 ===');
  let flexTotal = 0;
  let lockedTotal = 0;
  
  rows.forEach(r => {
    const amt = Number(r.amount) / 1e18;
    const isLocked = r.lock_period > 0;
    const date = new Date(Number(r.timestamp) * 1000).toLocaleString('zh-CN');
    
    if (isLocked) {
      lockedTotal += amt;
    } else {
      flexTotal += amt;
    }
    
    console.log(`  ${isLocked ? '🔒锁仓' : '💰灵活'} ${amt.toFixed(2)} USDT (${r.lock_period}天) ${date}`);
  });
  
  console.log('');
  console.log('灵活质押累计:', flexTotal.toFixed(2), 'USDT');
  console.log('锁仓质押累计:', lockedTotal.toFixed(2), 'USDT');
  console.log('总质押累计:', (flexTotal + lockedTotal).toFixed(2), 'USDT');
  
  await conn.end();
})();
