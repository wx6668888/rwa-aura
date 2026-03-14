const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  // RWA质押
  const rwaStaked = 409; // RWA
  const baseRate = 0.008;
  const days = 0.616;
  
  // 假设RWA质押是灵活的（0天锁仓）
  const rwaYield = rwaStaked * baseRate * days / 365;
  
  console.log('RWA质押收益：');
  console.log(`质押量: ${rwaStaked} RWA`);
  console.log(`收益率: 0.80%`);
  console.log(`收益: ${rwaYield.toFixed(6)} RWA`);
  
  console.log('\n=== 总收益（到今早8点）===');
  console.log(`USDT质押收益: 0.080460 RWA`);
  console.log(`RWA质押收益: ${rwaYield.toFixed(6)} RWA`);
  console.log(`总计: ${(0.080460 + rwaYield).toFixed(6)} RWA`);

  await conn.end();
})();
