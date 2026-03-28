import { query } from './src/config/database.config';

async function findSettlementByStakeId() {
  const stakeId = '17735040007016470';
  
  // 查询yield_settlements表
  const settlements = await query(
    `SELECT * FROM yield_settlements WHERE JSON_CONTAINS(calculation_details, '{"stakeId":"${stakeId}"}')`
  );
  
  console.log('结算记录数:', settlements.length);
  
  if (settlements.length > 0) {
    const s = settlements[0];
    console.log('\n=== 结算详情 ===');
    console.log('用户:', s.user_address);
    console.log('总收益:', parseFloat(s.total_yield) / 1e18, 'RWA');
    console.log('计算周期:', new Date(s.from_time * 1000).toLocaleString(), '→', new Date(s.to_time * 1000).toLocaleString());
    console.log('\n计算明细:');
    console.log(JSON.stringify(JSON.parse(s.calculation_details), null, 2));
  } else {
    console.log('数据库中没有找到这次结算记录');
  }
  
  process.exit(0);
}

findSettlementByStakeId();
