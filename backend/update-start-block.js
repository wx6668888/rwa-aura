// 更新 EventMonitor 起始区块到最新
const mysql = require('mysql2/promise');

async function updateStartBlock() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol',
  });

  // 更新到最新区块（跳过历史）
  const newBlock = 96034900; // 当前区块
  
  await pool.query(
    'UPDATE event_processing_state SET last_processed_block = ? WHERE id = 1',
    [newBlock]
  );
  
  console.log('✅ 已更新起始区块到:', newBlock);
  console.log('⚠️  注意: 跳过了历史区块的事件');
  console.log('💡 建议: 手动同步用户数据（运行 npm run sync-stats）');
  
  await pool.end();
}

updateStartBlock().catch(console.error);
