import { query } from './src/config/database.config';

async function checkUserYield() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  console.log('=== 用户RWA收益明细 ===\n');
  
  // 查询daily_yields表
  const yields = await query(
    `SELECT * FROM daily_yields 
     WHERE user_address = ? AND asset_type = 'RWA' 
     ORDER BY id DESC LIMIT 20`,
    [userAddress]
  );
  
  console.log('收益记录数:', yields.length);
  console.log('\n最近的收益记录:');
  yields.slice(0, 5).forEach((y: any) => {
    console.log(`- ${new Date(y.timestamp * 1000).toLocaleString()}: ${y.yield_amount} RWA (质押${y.principal_amount})`);
  });
  
  // 计算总收益
  const total = yields.reduce((sum: number, y: any) => sum + parseFloat(y.yield_amount), 0);
  console.log('\n总RWA收益:', total.toFixed(6), 'RWA');
  
  // 查询用户质押信息
  const stakes = await query(
    `SELECT * FROM stakes 
     WHERE user_address = ? AND asset_type = 'RWA' 
     ORDER BY id DESC`,
    [userAddress]
  );
  
  console.log('\n=== RWA质押记录 ===');
  console.log('质押次数:', stakes.length);
  stakes.forEach((s: any) => {
    console.log(`- 质押${s.amount} RWA, 时间: ${new Date(s.timestamp * 1000).toLocaleString()}`);
  });
  
  process.exit(0);
}

checkUserYield();
