import { query } from './src/config/database.config';

async function checkRwaStakes() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  const rwaStakes = await query(
    `SELECT * FROM rwa_stakes WHERE user_address = ?`,
    [userAddress]
  );
  
  console.log('=== rwa_stakes表 ===');
  console.log('记录数:', rwaStakes.length);
  
  if (rwaStakes.length > 0) {
    const s = rwaStakes[0];
    console.log('\n用户:', s.user_address);
    console.log('总质押:', parseFloat(s.total_staked_rwa) / 1e18, 'RWA');
    console.log('推荐人:', s.referrer);
    console.log('首次质押时间:', s.first_stake_time);
  }
  
  process.exit(0);
}

checkRwaStakes();
