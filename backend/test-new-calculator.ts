import { query } from './src/config/database.config';

async function testNewLogic() {
  const userAddress = '0xtest';
  
  // 模拟插入测试数据
  const day1_10am = 1710000000;
  const day1_1030am = day1_10am + 1800;
  const day1_11am = day1_10am + 3600;
  const day2_8am = day1_10am + 79200;
  
  console.log('=== 插入测试数据 ===');
  
  // 清理旧数据
  await query('DELETE FROM balance_snapshots WHERE user_address = ?', [userAddress]);
  
  // 10:00 质押1000 RWA
  await query(
    `INSERT INTO balance_snapshots (user_address, asset_type, balance_type, amount, timestamp, event_type) VALUES (?, 'RWA', 'flexible', '1000000000000000000000', ?, 'stake')`,
    [userAddress, day1_10am]
  );
  
  // 10:30 提现500 RWA
  await query(
    `INSERT INTO balance_snapshots (user_address, asset_type, balance_type, amount, timestamp, event_type) VALUES (?, 'RWA', 'flexible', '-500000000000000000000', ?, 'withdraw')`,
    [userAddress, day1_1030am]
  );
  
  // 11:00 质押1000 USDT锁仓30天
  await query(
    `INSERT INTO balance_snapshots (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time) VALUES (?, 'USDT', 'locked_30', '1000000000', ?, 'stake', ?)`,
    [userAddress, day1_11am, day1_11am + 30*86400]
  );
  
  console.log('✅ 测试数据已插入');
  console.log(`计算周期: ${new Date(day1_10am*1000).toLocaleString()} → ${new Date(day2_8am*1000).toLocaleString()}`);
  
  process.exit(0);
}

testNewLogic();
