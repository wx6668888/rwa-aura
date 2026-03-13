const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol'
  });

  const address = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';

  // 查询质押记录
  const [stakes] = await conn.query(
    'SELECT stake_id, amount, event_type, lock_period, timestamp, tx_hash, block_number FROM stake_events WHERE LOWER(user_address) = LOWER(?) ORDER BY timestamp DESC',
    [address]
  );

  console.log('\n=== 质押记录 ===');
  stakes.forEach(s => {
    const amount = (Number(s.amount) / 1e18).toFixed(2);
    console.log(`ID:${s.stake_id} | 金额:${amount} | 类型:${s.event_type} | 锁定:${s.lock_period}天 | 区块:${s.block_number} | TX:${s.tx_hash.substring(0, 10)}...`);
  });

  // 查询提现记录
  const [withdrawals] = await conn.query(
    'SELECT id, amount, event_type, timestamp, tx_hash, block_number FROM withdrawal_events WHERE LOWER(user_address) = LOWER(?) ORDER BY timestamp DESC',
    [address]
  );

  console.log('\n=== 提现记录 ===');
  withdrawals.forEach(w => {
    const amount = (Number(w.amount) / 1e18).toFixed(2);
    console.log(`ID:${w.id} | 金额:${amount} | 类型:${w.event_type} | 区块:${w.block_number} | TX:${w.tx_hash.substring(0, 10)}...`);
  });

  console.log(`\n总计: ${stakes.length} 笔质押, ${withdrawals.length} 笔提现\n`);

  await conn.end();
})().catch(console.error);
