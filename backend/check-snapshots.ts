import { query } from './src/config/database.config';

async function checkSnapshots() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  const snapshots = await query(
    `SELECT * FROM balance_snapshots 
     WHERE user_address = ? AND asset_type = 'RWA' 
     ORDER BY timestamp DESC LIMIT 10`,
    [userAddress]
  );
  
  console.log('=== RWA余额快照 ===');
  console.log('记录数:', snapshots.length);
  
  if (snapshots.length > 0) {
    snapshots.forEach((s: any) => {
      const amount = parseFloat(s.amount) / 1e18;
      console.log(`\n时间: ${new Date(s.timestamp * 1000).toLocaleString()}`);
      console.log(`类型: ${s.balance_type}`);
      console.log(`金额: ${amount} RWA`);
      console.log(`事件: ${s.event_type}`);
      if (s.lock_end_time) {
        console.log(`锁仓到期: ${new Date(s.lock_end_time * 1000).toLocaleString()}`);
      }
    });
  } else {
    console.log('没有余额快照记录');
  }
  
  process.exit(0);
}

checkSnapshots();
