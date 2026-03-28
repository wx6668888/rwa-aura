import { query } from './src/config/database.config';

async function checkEventMonitor() {
  // 查询最后处理的区块
  const result = await query(
    `SELECT * FROM event_monitor_state ORDER BY id DESC LIMIT 1`
  );
  
  console.log('EventMonitor状态:', result.length > 0 ? result[0] : '无记录');
  
  // 查询最近的质押记录
  const recentStakes = await query(
    `SELECT * FROM stakes ORDER BY id DESC LIMIT 5`
  );
  
  console.log('\n最近的质押记录数:', recentStakes.length);
  if (recentStakes.length > 0) {
    recentStakes.forEach((s: any) => {
      console.log(`- ${s.user_address.slice(0,10)}... ${s.asset_type} ${parseFloat(s.amount)}`);
    });
  }
  
  process.exit(0);
}

checkEventMonitor();
