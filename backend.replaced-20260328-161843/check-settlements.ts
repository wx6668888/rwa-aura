import { query } from './src/config/database.config';

async function checkSettlements() {
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  const settlements = await query(
    `SELECT * FROM yield_settlements 
     WHERE user_address = ? AND asset_type = 'RWA' 
     ORDER BY settlement_time DESC LIMIT 10`,
    [userAddress]
  );
  
  console.log('=== RWA收益结算记录 ===');
  console.log('记录数:', settlements.length);
  
  if (settlements.length > 0) {
    settlements.forEach((s: any) => {
      const yield_amount = parseFloat(s.total_yield) / 1e18;
      console.log(`\n结算时间: ${new Date(s.settlement_time * 1000).toLocaleString()}`);
      console.log(`收益金额: ${yield_amount.toFixed(6)} RWA`);
      console.log(`交易哈希: ${s.tx_hash}`);
      console.log(`计算周期: ${new Date(s.from_time * 1000).toLocaleString()} → ${new Date(s.to_time * 1000).toLocaleString()}`);
    });
  } else {
    console.log('没有结算记录');
  }
  
  process.exit(0);
}

checkSettlements();
