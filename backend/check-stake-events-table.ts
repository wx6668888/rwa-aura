import { query } from './src/config/database.config';

async function checkEventMonitorStatus() {
  // 查询最近处理的事件
  const recentEvents = await query(
    `SELECT * FROM stake_events ORDER BY id DESC LIMIT 5`
  );
  
  console.log('=== stake_events表最近记录 ===');
  console.log('记录数:', recentEvents.length);
  
  if (recentEvents.length > 0) {
    recentEvents.forEach((e: any) => {
      console.log(`\n用户: ${e.user_address}`);
      console.log(`金额: ${e.amount}`);
      console.log(`类型: ${e.event_type}`);
      console.log(`时间: ${new Date(e.timestamp * 1000).toLocaleString()}`);
    });
  } else {
    console.log('表为空');
  }
  
  process.exit(0);
}

checkEventMonitorStatus();
