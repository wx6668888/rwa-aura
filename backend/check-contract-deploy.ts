import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkContract() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const stakingAddress = process.env.STAKING_CONTRACT_ADDRESS!;
  
  console.log('=== 合约信息 ===');
  console.log('合约地址:', stakingAddress);
  
  // 获取合约部署区块
  const code = await provider.getCode(stakingAddress);
  console.log('合约代码长度:', code.length);
  
  // 获取当前区块
  const currentBlock = await provider.getBlockNumber();
  console.log('当前区块:', currentBlock);
  
  // 尝试找到合约部署区块（二分查找）
  let deployBlock = 0;
  let left = 0;
  let right = currentBlock;
  
  console.log('\n查找合约部署区块...');
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const codeAtMid = await provider.getCode(stakingAddress, mid);
    
    if (codeAtMid === '0x') {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  deployBlock = left;
  console.log('合约部署区块:', deployBlock);
  
  const deployBlockData = await provider.getBlock(deployBlock);
  if (deployBlockData) {
    console.log('部署时间:', new Date(deployBlockData.timestamp * 1000).toLocaleString());
  }
}

checkContract();
