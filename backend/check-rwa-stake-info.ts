import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkRwaStakeInfo() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'function rwaStakeInfo(address) view returns (uint256 totalStaked, uint256 rwaPending, uint256 lastRewardTime)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  const info = await staking.rwaStakeInfo(userAddress);
  
  console.log('用户地址:', userAddress);
  console.log('RWA总质押:', ethers.formatEther(info[0]), 'RWA');
  console.log('RWA待提取收益:', ethers.formatEther(info[1]), 'RWA');
  console.log('上次奖励时间:', new Date(Number(info[2]) * 1000).toLocaleString());
}

checkRwaStakeInfo();
