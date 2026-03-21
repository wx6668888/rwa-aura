import { query } from './src/config/database.config';

async function findRwaRewardSource() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  // 查询rewards表中RWA类型的奖励
  const rwaRewards = await query(
    `SELECT * FROM rewards 
     WHERE user_address = ? AND token_type = 'RWA' 
     ORDER BY timestamp DESC LIMIT 10`,
    [userAddress]
  );
  
  console.log('=== RWA类型奖励记录 ===');
  console.log('记录数:', rwaRewards.length);
  
  if (rwaRewards.length > 0) {
    let total = 0;
    rwaRewards.forEach((r: any) => {
      const amount = parseFloat(r.amount) / 1e18;
      total += amount;
      console.log(`\n时间: ${r.timestamp}`);
      console.log(`类型: ${r.reward_type}`);
      console.log(`金额: ${amount.toFixed(6)} RWA`);
    });
    console.log('\n总计:', total.toFixed(6), 'RWA');
  } else {
    console.log('没有RWA奖励记录');
  }
  
  process.exit(0);
}

findRwaRewardSource();
