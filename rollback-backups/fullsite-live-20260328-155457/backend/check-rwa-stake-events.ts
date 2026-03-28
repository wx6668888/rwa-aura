import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkRWAStakeEvents() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 20000);
  
  console.log(`查询区块范围: ${fromBlock} - ${currentBlock}`);
  
  const filter = staking.filters.RWAStakeEvent(userAddress);
  const events = await staking.queryFilter(filter, fromBlock, currentBlock);
  
  console.log('\n=== RWA质押事件 ===');
  console.log('事件数:', events.length);
  
  if (events.length > 0) {
    events.forEach((e: any, i: number) => {
      if (e.args) {
        const amount = ethers.formatEther(e.args.amount);
        console.log(`\n${i+1}. Block ${e.blockNumber}: ${amount} RWA (锁仓${e.args.lockPeriod}天)`);
      }
    });
  }
}

checkRWAStakeEvents();
