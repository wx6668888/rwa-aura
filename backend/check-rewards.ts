import { query } from './src/config/database.config';

async function checkRewards() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  // 查询rewards表
  const rewards = await query(
    `SELECT * FROM rewards 
     WHERE user_address = ? 
     ORDER BY id DESC LIMIT 10`,
    [userAddress]
  );
  
  console.log('=== 用户奖励记录 ===');
  console.log('记录数:', rewards.length);
  
  rewards.forEach((r: any) => {
    console.log(`\nID: ${r.id}`);
    console.log(`类型: ${r.reward_type}`);
    console.log(`金额: ${r.amount}`);
    console.log(`资产: ${r.asset_type || 'N/A'}`);
    console.log(`时间: ${new Date(r.timestamp * 1000).toLocaleString()}`);
  });
  
  // 统计RWA奖励
  const rwaRewards = rewards.filter((r: any) => r.asset_type === 'RWA');
  const totalRwa = rwaRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);
  
  console.log('\n=== 统计 ===');
  console.log('RWA奖励记录数:', rwaRewards.length);
  console.log('RWA总奖励:', totalRwa, 'RWA');
  
  process.exit(0);
}

checkRewards();
