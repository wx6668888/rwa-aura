import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkStakeEvents() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 stakeId, uint256 timestamp, uint256 lockPeriod)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  // 查询最近20000个区块的质押事件
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 20000);
  
  console.log(`查询区块范围: ${fromBlock} - ${currentBlock}`);
  
  const filter = staking.filters.StakeEvent(userAddress);
  const events = await staking.queryFilter(filter, fromBlock, currentBlock);
  
  console.log('\n=== 用户质押事件 ===');
  console.log('事件数:', events.length);
  
  if (events.length > 0) {
    events.forEach((e: any) => {
      if (e.args) {
        const amount = ethers.formatEther(e.args.amount);
        console.log(`\nBlock ${e.blockNumber}: ${amount} (锁仓${e.args.lockPeriod}天)`);
        console.log(`TxHash: ${e.transactionHash}`);
      }
    });
  }
}

checkStakeEvents();
