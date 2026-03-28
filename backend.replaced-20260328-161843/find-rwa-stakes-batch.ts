import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function findAllRWAStakesBatch() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const STAKING_ABI = ['event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)'];
  const staking = new ethers.Contract(process.env.STAKING_CONTRACT_ADDRESS!, STAKING_ABI, provider);
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  const currentBlock = await provider.getBlockNumber();
  
  const batchSize = 40000;
  const totalRange = 80000; // 只查询最近80000个区块
  let allEvents: any[] = [];
  
  for (let i = 0; i < totalRange; i += batchSize) {
    const toBlock = currentBlock - i;
    const fromBlock = Math.max(0, toBlock - batchSize);
    
    console.log(`查询区块 ${fromBlock} - ${toBlock}...`);
    const filter = staking.filters.RWAStakeEvent(userAddress);
    const events = await staking.queryFilter(filter, fromBlock, toBlock);
    
    if (events.length > 0) {
      allEvents.push(...events);
      console.log(`找到 ${events.length} 个事件`);
    }
  }
  
  console.log('\n=== 总计 ===');
  console.log('事件数:', allEvents.length);
  
  let total = 0n;
  allEvents.forEach((e: any) => {
    const eventLog = e as ethers.EventLog;
    if (eventLog.args) {
      total += eventLog.args.amount;
      console.log(`${ethers.formatEther(eventLog.args.amount)} RWA (锁仓${eventLog.args.lockPeriod}天)`);
    }
  });
  
  console.log('\n总质押:', ethers.formatEther(total), 'RWA');
}

findAllRWAStakesBatch();
