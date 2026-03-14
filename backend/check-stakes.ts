import { query } from './src/config/database.config';

async function checkStakes() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  const stakes = await query(
    `SELECT * FROM stakes WHERE user_address = ? ORDER BY id DESC`,
    [userAddress]
  );
  
  console.log('=== 用户质押记录 ===');
  console.log('总记录数:', stakes.length);
  
  const rwaStakes = stakes.filter((s: any) => s.asset_type === 'RWA');
  const usdtStakes = stakes.filter((s: any) => s.asset_type === 'USDT');
  
  console.log('\nRWA质押:', rwaStakes.length, '笔');
  console.log('USDT质押:', usdtStakes.length, '笔');
  
  if (rwaStakes.length > 0) {
    console.log('\n=== RWA质押明细 ===');
    rwaStakes.forEach((s: any) => {
      console.log(`金额: ${s.amount}, 时间: ${new Date(s.timestamp * 1000).toLocaleString()}`);
    });
    
    const totalRwa = rwaStakes.reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0);
    console.log('\nRWA总质押:', totalRwa, 'RWA');
  }
  
  process.exit(0);
}

checkStakes();
