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
  
  // 检查stake_events中1000 USDT的记录
  const [stakeRows] = await conn.query(`
    SELECT CAST(amount AS DECIMAL(38,0)) as amount, lock_period, tx_hash 
    FROM stake_events 
    WHERE LOWER(user_address) = LOWER(?) 
    AND event_type LIKE '%USDT%'
    AND CAST(amount AS DECIMAL(38,0)) = 1000000000000000000000
    ORDER BY timestamp
  `, [addr]);
  
  console.log('=== stake_events中1000 USDT质押记录 ===');
  stakeRows.forEach(r => {
    const amt = Number(r.amount) / 1e18;
    console.log(`  ${amt} USDT, lock: ${r.lock_period}天, tx: ${r.tx_hash.substring(0, 10)}`);
  });
  
  console.log('');
  console.log('结论：stake_events中只有1笔1000 USDT锁仓');
  console.log('但locked_stakes中有2笔1000 USDT锁仓（都是tx=0x0）');
  console.log('说明locked_stakes表有重复或错误数据！');
  
  await conn.end();
})();
