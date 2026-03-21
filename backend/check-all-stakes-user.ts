import { query } from './src/config/database.config';

async function checkAllStakes() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  // 查询所有质押
  const stakes = await query(
    `SELECT * FROM stakes 
     WHERE user_address = ? 
     ORDER BY timestamp ASC`,
    [userAddress]
  );
  
  console.log('=== 用户所有质押 ===');
  console.log('总数:', stakes.length);
  
  if (stakes.length > 0) {
    stakes.forEach((s: any, i: number) => {
      console.log(`\n${i+1}. ${s.asset_type} ${parseFloat(s.amount)} (${new Date(s.timestamp * 1000).toLocaleString()})`);
      console.log(`   锁仓期: ${s.lock_period}天, StakeID: ${s.stake_id}`);
    });
  }
  
  process.exit(0);
}

checkAllStakes();
