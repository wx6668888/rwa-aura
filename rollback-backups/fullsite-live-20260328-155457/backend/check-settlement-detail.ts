import { query } from './src/config/database.config';

async function checkSettlement() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  // 查询这次结算记录
  const settlement = await query(
    `SELECT * FROM yield_settlements 
     WHERE user_address = ? AND tx_hash = ?`,
    [userAddress, '0xed62ff7d6a9ae173dc50679e542a8d5003a5b213b21e5b104fc4a2267a53986a']
  );
  
  console.log('=== 结算记录 ===');
  if (settlement.length > 0) {
    const s = settlement[0];
    console.log('结算时间:', new Date(s.settlement_time * 1000).toLocaleString());
    console.log('计算周期:', new Date(s.from_time * 1000).toLocaleString(), '→', new Date(s.to_time * 1000).toLocaleString());
    console.log('总收益:', parseFloat(s.total_yield) / 1e18, 'RWA');
    console.log('\n计算详情:');
    console.log(JSON.stringify(JSON.parse(s.calculation_details), null, 2));
  } else {
    console.log('没有找到结算记录');
  }
  
  process.exit(0);
}

checkSettlement();
