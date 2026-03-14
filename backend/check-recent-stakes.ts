import { query } from './src/config/database.config';

async function checkStakes() {
  const recentStakes = await query(
    `SELECT * FROM stakes ORDER BY id DESC LIMIT 10`
  );
  
  console.log('最近10条质押记录:');
  console.log('总数:', recentStakes.length);
  
  if (recentStakes.length > 0) {
    recentStakes.forEach((s: any) => {
      console.log(`\n用户: ${s.user_address}`);
      console.log(`资产: ${s.asset_type} ${parseFloat(s.amount)}`);
      console.log(`时间: ${new Date(s.timestamp * 1000).toLocaleString()}`);
    });
  }
  
  process.exit(0);
}

checkStakes();
