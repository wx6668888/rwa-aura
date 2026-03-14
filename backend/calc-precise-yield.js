const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  // 获取所有USDT质押记录
  const [stakes] = await conn.query(`
    SELECT stake_id, amount, lock_period, timestamp 
    FROM stake_events 
    WHERE LOWER(user_address) = LOWER('0xCD5b97505499B1575e481446384430bb159851b6')
    ORDER BY timestamp
  `);

  console.log('=== 每笔质押详情 ===\n');
  
  const baseRate = 0.008; // 0.8% 年化
  const lockBonus = {0: 0, 30: 0.3, 90: 0.6, 180: 1.0, 365: 1.5};
  
  // 目标时间：2026-03-14 08:00:00 (北京时间)
  const targetTime = new Date('2026-03-14T00:00:00Z').getTime() / 1000; // UTC 00:00 = 北京08:00
  
  let totalYield = 0;
  
  stakes.forEach((s, i) => {
    const amount = Number(s.amount) / 1e18;
    const tsStr = String(s.timestamp); // YYYYMMDDHHmmss
    const year = tsStr.substr(0, 4);
    const month = tsStr.substr(4, 2);
    const day = tsStr.substr(6, 2);
    const hour = tsStr.substr(8, 2);
    const min = tsStr.substr(10, 2);
    const sec = tsStr.substr(12, 2);
    const stakeDate = `${year}-${month}-${day} ${hour}:${min}:${sec}`;
    const stakeTime = new Date(stakeDate).getTime() / 1000;
    
    const lockPeriod = s.lock_period;
    const bonus = lockBonus[lockPeriod] || 0;
    const rate = baseRate * (1 + bonus);
    
    // 计算持有秒数
    const holdSeconds = targetTime - stakeTime;
    const holdDays = holdSeconds / 86400;
    
    // 按秒计算收益
    const yieldUsdt = amount * rate * holdSeconds / (365 * 86400);
    const yieldRwa = yieldUsdt / 0.85; // 假设RWA价格0.85
    
    totalYield += yieldRwa;
    console.log(`${i+1}. Stake ID: ${s.stake_id}`);
    console.log(`   金额: ${amount} USDT`);
    console.log(`   锁仓: ${lockPeriod}天 (加成${(bonus*100).toFixed(0)}%)`);
    console.log(`   时间: ${stakeDate}`);
    console.log(`   持有: ${holdDays.toFixed(4)}天 (${holdSeconds}秒)`);
    console.log(`   收益率: ${(rate*100).toFixed(2)}%`);
    console.log(`   收益: ${yieldRwa.toFixed(8)} RWA\n`);
  });
  
  console.log(`=== USDT质押总收益: ${totalYield.toFixed(8)} RWA ===`);

  await conn.end();
})();
