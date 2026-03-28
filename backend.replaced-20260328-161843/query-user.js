const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  const address = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';

  // 查询质押记录
  const [stakes] = await pool.query(
    'SELECT id, event_type, amount, lock_period, timestamp FROM stake_events WHERE LOWER(user_address)=LOWER(?) ORDER BY timestamp DESC',
    [address]
  );

  console.log('=== 质押记录 ===');
  stakes.forEach(r => {
    const amount = (Number(r.amount) / 1e18).toFixed(2);
    const time = new Date(r.timestamp * 1000).toLocaleString('zh-CN');
    console.log(`ID:${r.id} | ${r.event_type} | ${amount} | 锁定:${r.lock_period}天 | ${time}`);
  });

  // 查询提现记录
  const [withdrawals] = await pool.query(
    'SELECT id, event_type, amount, timestamp FROM withdrawal_events WHERE LOWER(user_address)=LOWER(?) ORDER BY timestamp DESC',
    [address]
  );

  console.log('\n=== 提现记录 ===');
  withdrawals.forEach(r => {
    const amount = (Number(r.amount) / 1e18).toFixed(2);
    const time = new Date(r.timestamp * 1000).toLocaleString('zh-CN');
    console.log(`ID:${r.id} | ${r.event_type} | ${amount} | ${time}`);
  });

  await pool.end();
})();
