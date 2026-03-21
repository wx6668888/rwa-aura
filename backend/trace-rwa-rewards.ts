import { query } from './src/config/database.config';

async function traceRwaRewards() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  // 查询这个用户作为受益人的奖励记录
  const rewards = await query(
    `SELECT * FROM rewards 
     WHERE user_address = ? 
     ORDER BY timestamp DESC LIMIT 20`,
    [userAddress]
  );
  
  console.log('=== 用户作为受益人的奖励记录 ===');
  console.log('总记录数:', rewards.length);
  
  if (rewards.length > 0) {
    console.log('\n最近10条:');
    rewards.slice(0, 10).forEach((r: any) => {
      const amount = parseFloat(r.amount) / 1e18;
      console.log(`- ${amount.toFixed(6)} (类型: ${r.reward_type}, 来自质押ID: ${r.stake_id || 'N/A'})`);
    });
    
    // 计算总奖励
    const total = rewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0) / 1e18;
    console.log('\n累计奖励:', total.toFixed(6));
  }
  
  // 查询这个用户的下级质押（产生奖励的来源）
  const downlineStakes = await query(
    `SELECT s.*, u.referrer 
     FROM stakes s 
     JOIN users u ON s.user_address = u.address 
     WHERE u.referrer = ? 
     ORDER BY s.timestamp DESC LIMIT 10`,
    [userAddress]
  );
  
  console.log('\n=== 下级质押记录（产生奖励的来源）===');
  console.log('下级质押数:', downlineStakes.length);
  
  if (downlineStakes.length > 0) {
    downlineStakes.forEach((s: any) => {
      const amount = parseFloat(s.amount);
      console.log(`- 下级${s.user_address.slice(0,10)}... 质押${amount} ${s.asset_type}`);
    });
  }
  
  process.exit(0);
}

traceRwaRewards();
