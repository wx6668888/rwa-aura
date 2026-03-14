import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkRwaYield() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'function users(address) view returns (uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  const userInfo = await staking.users(userAddress);
  
  console.log('用户地址:', userAddress);
  console.log('RWA待提取收益:', ethers.formatEther(userInfo[1]), 'RWA');
  console.log('总质押:', ethers.formatUnits(userInfo[0], 6), 'USDT');
  console.log('USDT奖励:', ethers.formatUnits(userInfo[2], 6), 'USDT');
}

checkRwaYield();
