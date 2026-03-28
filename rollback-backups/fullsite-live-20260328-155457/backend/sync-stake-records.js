// 同步链上质押记录到 stake_events 表
const mysql = require('mysql2/promise');
const ethers = require('ethers');

const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const STAKING_CONTRACT = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const USER_ADDRESS = '0xCD5b97505499B1575e481446384430bb159851b6';

const ABI = [
  'function users(address) view returns (uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
  'function rwaStakes(address) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)'
];

async function syncStakeRecords() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'wuxi3211',
    database: 'rwa_protocol',
  });

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(STAKING_CONTRACT, ABI, provider);
  
  console.log('🔄 同步质押记录到 stake_events 表\n');
  
  // 1. 读取链上数据
  const [userInfo, rwaInfo] = await Promise.all([
    contract.users(USER_ADDRESS),
    contract.rwaStakes(USER_ADDRESS)
  ]);
  
  const usdtStaked = userInfo.totalStaked.toString();
  const rwaStaked = rwaInfo.totalStakedRWA.toString();
  const firstStakeTime = Number(rwaInfo.firstStakeTime || userInfo.firstStakeTime);
  
  console.log('📊 链上数据:');
  console.log('  USDT 质押:', Number(usdtStaked) / 1e18);
  console.log('  RWA 质押:', Number(rwaStaked) / 1e18);
  console.log('  首次质押:', new Date(firstStakeTime * 1000).toLocaleString());
  console.log('');
  
  // 2. 检查数据库中是否已有记录
  const [existing] = await pool.query(
    'SELECT COUNT(*) as count FROM stake_events WHERE LOWER(user_address) = LOWER(?)',
    [USER_ADDRESS]
  );
  
  console.log('📊 数据库现有记录:', existing[0].count, '条\n');
  
  // 3. 创建汇总记录（如果没有）
  if (existing[0].count === 0 && Number(rwaStaked) > 0) {
    await pool.query(
      `INSERT INTO stake_events (
        stake_id, user_address, amount, lock_period, event_type, 
        tx_hash, block_number, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
      [
        `rwa_summary_${firstStakeTime}`,
        USER_ADDRESS.toLowerCase(),
        rwaStaked,
        0, // 灵活质押
        'RWA',
        '0x0000000000000000000000000000000000000000000000000000000000000000', // 占位
        0,
        firstStakeTime
      ]
    );
    console.log('✅ 已创建 RWA 汇总记录');
  }
  
  if (existing[0].count === 0 && Number(usdtStaked) > 0) {
    await pool.query(
      `INSERT INTO stake_events (
        stake_id, user_address, amount, lock_period, event_type, 
        tx_hash, block_number, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
      [
        `usdt_summary_${firstStakeTime}`,
        USER_ADDRESS.toLowerCase(),
        usdtStaked,
        0,
        'USDT',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        0,
        firstStakeTime
      ]
    );
    console.log('✅ 已创建 USDT 汇总记录');
  }
  
  console.log('\n⚠️  注意: 这是汇总记录，不是真实的质押明细');
  console.log('💡 建议: 在服务器上重启 EventMonitor 以获取完整历史');
  
  await pool.end();
}

syncStakeRecords().catch(console.error);
