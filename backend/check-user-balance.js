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
  
  // 当前锁仓金额（未提现的）
  const [locked] = await conn.query(`
    SELECT 
      SUM(CASE WHEN is_rwa_stake = 0 AND is_withdrawn = 0 THEN CAST(amount AS DECIMAL(38,0)) ELSE 0 END) as locked_usdt,
      SUM(CASE WHEN is_rwa_stake = 1 AND is_withdrawn = 0 THEN CAST(amount AS DECIMAL(38,0)) ELSE 0 END) as locked_rwa
    FROM locked_stakes
    WHERE LOWER(user_address) = LOWER(?)
  `, [addr]);
  
  const lockedUSDT = Number(locked[0].locked_usdt || 0) / 1e18;
  const lockedRWA = Number(locked[0].locked_rwa || 0) / 1e18;
  
  console.log('=== 用户数据检查 ===');
  console.log('用户地址:', addr);
  console.log('');
  console.log('当前锁仓USDT:', lockedUSDT.toFixed(2));
  console.log('当前锁仓RWA:', lockedRWA.toFixed(2));
  console.log('');
  console.log('提示：需要从合约读取当前总质押（totalStaked）');
  console.log('灵活本金 = 合约totalStaked - 当前锁仓');
  
  await conn.end();
})();
