// 检查 EventMonitor 处理状态
const mysql = require('mysql2/promise');
const ethers = require('ethers');

async function checkEventMonitorStatus() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol',
  });

  console.log('🔍 检查 EventMonitor 状态\n');
  
  // 1. 检查最后处理的区块
  const [state] = await pool.query(
    'SELECT * FROM event_processing_state ORDER BY id DESC LIMIT 1'
  );
  
  if (state && state.length > 0) {
    const lastBlock = state[0].last_processed_block;
    const lastTime = state[0].updated_at;
    console.log('📊 数据库状态:');
    console.log('  最后处理区块:', lastBlock);
    console.log('  最后更新时间:', lastTime);
    console.log('');
  }
  
  // 2. 查询链上最新区块
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
  const currentBlock = await provider.getBlockNumber();
  console.log('📊 链上状态:');
  console.log('  当前区块:', currentBlock);
  console.log('');
  
  // 3. 计算差距
  if (state && state.length > 0) {
    const gap = currentBlock - state[0].last_processed_block;
    console.log('📊 同步状态:');
    console.log('  区块差距:', gap);
    console.log('  确认延迟: 12 区块');
    console.log('');
    
    if (gap > 100) {
      console.log('⚠️  警告: 区块差距过大，EventMonitor 可能未运行');
    } else if (gap > 12) {
      console.log('⏳ 正常: 等待确认中（需要12个区块）');
    } else {
      console.log('✅ 正常: 同步中');
    }
  }
  
  await pool.end();
}

checkEventMonitorStatus().catch(console.error);
