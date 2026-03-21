import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUpdateRewardsCalls() {
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
  
  // 查询最近1000个区块的RewardsUpdated事件
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 1000;
  
  const filter = staking.filters.RewardsUpdated(userAddress);
  const events = await staking.queryFilter(filter, fromBlock, currentBlock);
  
  console.log('=== RewardsUpdated事件（最近1000区块）===');
  console.log('事件数:', events.length);
  
  let totalRwa = 0n;
  events.forEach((e: any) => {
    const rwAmount = ethers.formatEther(e.args.rwAmount);
    const usdtAmount = ethers.formatUnits(e.args.usdtAmount, 6);
    totalRwa += e.args.rwAmount;
    console.log(`\nRWA: ${rwAmount}, USDT: ${usdtAmount}`);
    console.log(`StakeID: ${e.args.stakeId}, Block: ${e.blockNumber}`);
  });
  
  console.log('\n总RWA奖励:', ethers.formatEther(totalRwa));
}

checkUpdateRewardsCalls();
