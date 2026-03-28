import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function getBlockTime() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const block = await provider.getBlock(95700528);
  
  if (block) {
    console.log('区块时间:', new Date(block.timestamp * 1000).toLocaleString('zh-CN'));
    console.log('时间戳:', block.timestamp);
  }
}

getBlockTime();
