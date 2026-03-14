const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  // 获取所有质押记录
  const [stakes] = await conn.query(`
    SELECT amount, lock_period 
    FROM stake_events 
    WHERE LOWER(user_address) = LOWER('0xCD5b97505499B1575e481446384430bb159851b6')
  `);

  console.log('质押记录：');
  stakes.forEach((s, i) => {
    const amount = Number(s.amount) / 1e18;
    console.log(`${i+1}. ${amount} USDT, 锁仓${s.lock_period}天`);
  });

  // 计算总收益
  const baseRate = 0.008; // 0.8%
  const lockBonus = {0: 0, 30: 0.3, 90: 0.6, 180: 1.0, 365: 1.5};
  const days = 0.616; // 从昨天17:12到今早08:00
  
  let totalYield = 0;
  stakes.forEach(s => {
    const amount = Number(s.amount) / 1e18;
    const bonus = lockBonus[s.lock_period] || 0;
    const rate = baseRate * (1 + bonus);
    const yield = amount * rate * days / 365;
    totalYield += yield;
    console.log(`  收益率: ${(rate*100).toFixed(2)}%, 收益: ${yield.toFixed(6)} USDT`);
  });

  console.log(`\nUSDT总收益: ${totalYield.toFixed(6)} USDT`);
  console.log(`转RWA (假设0.85): ${(totalYield/0.85).toFixed(6)} RWA`);

  await conn.end();
})();
