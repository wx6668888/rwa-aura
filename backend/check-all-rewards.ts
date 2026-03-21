import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAllRewards() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'event RewardsUpdated(address indexed user, uint256 rwAmount, uint256 usdtAmount, uint256 stakeId, uint256 timestamp)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  // 查询最近10000个区块
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 10000);
  
  console.log(`查询区块范围: ${fromBlock} - ${currentBlock}`);
  
  const filter = staking.filters.RewardsUpdated(userAddress);
  const events = await staking.queryFilter(filter, fromBlock, currentBlock);
  
  console.log('\n=== RewardsUpdated事件 ===');
  console.log('事件数:', events.length);
  
  let totalRwa = 0n;
  events.forEach((e: any) => {
    if (e.args) {
      const rwAmount = ethers.formatEther(e.args.rwAmount);
      totalRwa += e.args.rwAmount;
      console.log(`\nBlock ${e.blockNumber}: RWA ${rwAmount}`);
      console.log(`交易: ${e.transactionHash}`);
    }
  });
  
  console.log('\n总RWA:', ethers.formatEther(totalRwa));
}

checkAllRewards();
