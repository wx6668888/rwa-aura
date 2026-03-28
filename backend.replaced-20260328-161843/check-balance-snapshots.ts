import { query } from './src/config/database.config';

async function checkBalanceSnapshots() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  const snapshots = await query(
    `SELECT * FROM balance_snapshots WHERE user_address = ? AND asset_type = 'RWA' ORDER BY timestamp DESC LIMIT 5`,
    [userAddress]
  );
  
  console.log('balance_snapshots表（RWA）:');
  console.log('记录数:', snapshots.length);
  
  if (snapshots.length > 0) {
    snapshots.forEach((s: any) => {
      console.log(`\n金额: ${parseFloat(s.amount) / 1e18} RWA`);
      console.log(`类型: ${s.balance_type}`);
      console.log(`时间: ${new Date(s.timestamp * 1000).toLocaleString()}`);
    });
  } else {
    console.log('表为空 - 这就是为什么每日结算找不到用户！');
  }
  
  process.exit(0);
}

checkBalanceSnapshots();
