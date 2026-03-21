const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });
  
  const [events] = await conn.execute(
    'SELECT event_type, amount FROM stake_events WHERE user_address = ?',
    ['0xcd5b97505499b1575e481446384430bb159851b6']
  );
  
  console.log('质押记录:');
  let total = 0n;
  for (const e of events) {
    console.log(`${e.event_type}: ${e.amount}`);
    if (e.event_type === 'USDT') {
      // USDT amount已经是18位精度，直接累加
      total += BigInt(e.amount);
    } else if (e.event_type === 'RWA') {
      // RWA转USDT等值（×0.85）
      const rwaUsdt = BigInt(e.amount) * 85n / 100n;
      total += rwaUsdt;
    }
  }
  
  console.log('累计质押（18位）:', total.toString());
  console.log('累计质押（USDT）:', Number(total) / 1e18);
  
  await conn.execute(
    'UPDATE users SET cumulative_personal_stake = ? WHERE address = ?',
    [total.toString(), '0xcd5b97505499b1575e481446384430bb159851b6']
  );
  
  console.log('✅ 已更新cumulative_personal_stake');
  await conn.end();
})();
