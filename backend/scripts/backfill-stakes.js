const { ethers } = require('ethers');
const Database = require('better-sqlite3');
const path = require('path');

const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const STAKING_CONTRACT = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
const START_BLOCK = 95204000; // 从合约部署前开始
const BATCH_SIZE = 500; // 减小批次避免超时

const provider = new ethers.JsonRpcProvider(RPC_URL);
const dbPath = path.join(__dirname, '../database/events.db');
const db = new Database(dbPath);

const stakingAbi = [
  'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, string stakeId, uint256 lockPeriod)',
  'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, string stakeId, uint256 lockPeriod)'
];

const contract = new ethers.Contract(STAKING_CONTRACT, stakingAbi, provider);

async function backfill() {
  console.log('[Backfill] 开始回填历史数据...');
  
  const currentBlock = await provider.getBlockNumber();
  console.log(`[Backfill] 当前区块: ${currentBlock}`);
  console.log(`[Backfill] 开始区块: ${START_BLOCK}`);
  
  let fromBlock = START_BLOCK;
  let totalUSDT = 0;
  let totalRWA = 0;
  
  while (fromBlock < currentBlock) {
    const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, currentBlock);
    
    try {
      console.log(`[Backfill] 扫描区块 ${fromBlock} - ${toBlock}`);
      
      const [usdtStakes, rwaStakes] = await Promise.all([
        contract.queryFilter('StakeEvent', fromBlock, toBlock),
        contract.queryFilter('RWAStakeEvent', fromBlock, toBlock)
      ]);
      
      // 插入 USDT 质押
      for (const event of usdtStakes) {
        const block = await event.getBlock();
        db.prepare(`
          INSERT OR IGNORE INTO stake_events 
          (event_type, user_address, amount, referrer, stake_id, lock_period, block_number, transaction_hash, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'Stake',
          event.args.user.toLowerCase(),
          event.args.amount.toString(),
          event.args.referrer.toLowerCase(),
          event.args.stakeId,
          Number(event.args.lockPeriod),
          event.blockNumber,
          event.transactionHash,
          block.timestamp
        );
        totalUSDT++;
      }
      
      // 插入 RWA 质押
      for (const event of rwaStakes) {
        const block = await event.getBlock();
        db.prepare(`
          INSERT OR IGNORE INTO stake_events 
          (event_type, user_address, amount, referrer, stake_id, lock_period, block_number, transaction_hash, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'RWAStake',
          event.args.user.toLowerCase(),
          event.args.amount.toString(),
          event.args.referrer.toLowerCase(),
          event.args.stakeId,
          Number(event.args.lockPeriod),
          event.blockNumber,
          event.transactionHash,
          block.timestamp
        );
        totalRWA++;
      }
      
      if (usdtStakes.length > 0 || rwaStakes.length > 0) {
        console.log(`[Backfill] ✅ 找到 ${usdtStakes.length} 个 USDT 质押, ${rwaStakes.length} 个 RWA 质押`);
      }
      
      fromBlock = toBlock + 1;
      
      // 避免 RPC 限流
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`[Backfill] ❌ 扫描失败 ${fromBlock}-${toBlock}:`, error.message);
      fromBlock = toBlock + 1;
    }
  }
  
  console.log(`[Backfill] 回填完成！USDT 质押: ${totalUSDT}, RWA 质押: ${totalRWA}`);
}

backfill().catch(console.error);
