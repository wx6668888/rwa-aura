import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function queryRwaStakes() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  const STAKING_ABI = [
    'function rwaStakes(address) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)'
  ];
  
  const staking = new ethers.Contract(
    process.env.STAKING_CONTRACT_ADDRESS!,
    STAKING_ABI,
    provider
  );
  
  const userAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  try {
    const data = await staking.rwaStakes(userAddress);
    
    console.log('=== 合约RWA质押数据 ===');
    console.log('用户地址:', userAddress);
    console.log('RWA总质押:', ethers.formatEther(data[0]), 'RWA');
    console.log('RWA待提取收益:', ethers.formatEther(data[1]), 'RWA');
    console.log('上次提现时间:', new Date(Number(data[2]) * 1000).toLocaleString());
    console.log('推荐人:', data[3]);
    console.log('首次质押时间:', new Date(Number(data[4]) * 1000).toLocaleString());
    console.log('节点等级:', data[5]);
    console.log('是否激活:', data[6]);
  } catch (error: any) {
    console.log('查询失败:', error.message);
  }
}

queryRwaStakes();
