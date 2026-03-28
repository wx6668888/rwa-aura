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

  const addr = '0xa941f4806e0e3ea7577aec6c015d6e9d91584638';
  
  const [stakes] = await conn.query(
    'SELECT event_type, amount, lock_period, timestamp FROM stake_events WHERE LOWER(user_address) = LOWER(?) AND event_type = ? ORDER BY timestamp DESC LIMIT 5',
    [addr, 'USDT']
  );
  
  console.log('最近5笔USDT质押:');
  stakes.forEach(s => {
    const amt = (BigInt(s.amount) / 10n**18n).toString();
    const time = new Date(s.timestamp * 1000).toLocaleString();
    console.log(`  amount: ${amt} USDT, lock: ${s.lock_period}天, time: ${time}`);
  });

  const [withdrawals] = await conn.query(
    'SELECT event_type, amount, timestamp FROM withdrawal_events WHERE LOWER(user_address) = LOWER(?) AND event_type LIKE ? ORDER BY timestamp DESC LIMIT 3',
    [addr, '%USDT%']
  );
  
  console.log('\n最近3笔USDT提现:');
  withdrawals.forEach(w => {
    const amt = (BigInt(w.amount) / 10n**18n).toString();
    const time = new Date(w.timestamp * 1000).toLocaleString();
    console.log(`  amount: ${amt} USDT, type: ${w.event_type}, time: ${time}`);
  });

  await conn.end();
})();
