import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function findAllRWAStakes() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  const currentBlock = await provider.getBlockNumber();
  
  // 从最近100000个区块开始搜索
  const fromBlock = Math.max(0, currentBlock - 100000);
  
  console.log(`查询区块范围: ${fromBlock} - ${currentBlock}`);
  console.log('用户地址:', userAddress);
  
  const filter = staking.filters.RWAStakeEvent(userAddress);
  const events = await staking.queryFilter(filter, fromBlock, currentBlock);
  
  console.log('\n=== RWA质押事件 ===');
  console.log('事件数:', events.length);
  
  if (events.length > 0) {
    let total = 0n;
    for (const e of events) {
      const eventLog = e as ethers.EventLog;
      if (eventLog.args) {
        const amount = eventLog.args.amount;
        total += amount;
        console.log(`\nBlock ${e.blockNumber}: ${ethers.formatEther(amount)} RWA (锁仓${eventLog.args.lockPeriod}天)`);
        console.log(`StakeID: ${eventLog.args.stakeId}`);
      }
    }
    console.log('\n总质押:', ethers.formatEther(total), 'RWA');
  } else {
    console.log('没有找到RWA质押事件');
  }
}

findAllRWAStakes();
