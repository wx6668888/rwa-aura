// 检查数据库中的质押记录
const mysql = require('mysql2/promise');

async function checkStakeRecords() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol',
  });

  const address = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  console.log('🔍 检查质押记录:', address);
  console.log('');
  
  // 1. 查询所有质押记录
  const [stakes] = await pool.query(
    `SELECT stake_id, user_address, amount, event_type, lock_period, 
            timestamp, tx_hash, block_number
     FROM stake_events 
     WHERE LOWER(user_address) = LOWER(?)
     ORDER BY timestamp DESC
     LIMIT 10`,
    [address]
  );
  
  console.log(`📊 找到 ${stakes.length} 条质押记录:`);
  console.log('');
  
  stakes.forEach((s, i) => {
    const amount = Number(s.amount) / 1e18;
    const time = new Date(s.timestamp).toLocaleString();
    console.log(`${i + 1}. ${s.event_type} 质押:`);
    console.log(`   金额: ${amount} ${s.event_type}`);
    console.log(`   时间: ${time}`);
    console.log(`   锁仓: ${s.lock_period} 天`);
    console.log(`   交易: ${s.tx_hash}`);
    console.log('');
  });
  
  // 2. 检查最近的RWA质押
  const [recentRWA] = await pool.query(
    `SELECT * FROM stake_events 
     WHERE LOWER(user_address) = LOWER(?)
     AND event_type = 'RWA'
     ORDER BY timestamp DESC
     LIMIT 5`,
    [address]
  );
  
  console.log(`📊 最近的RWA质押记录: ${recentRWA.length} 条`);
  recentRWA.forEach((s, i) => {
    const amount = Number(s.amount) / 1e18;
    console.log(`  ${i + 1}. ${amount} RWA - ${new Date(s.timestamp).toLocaleString()}`);
  });
  
  await pool.end();
}

checkStakeRecords().catch(console.error);
