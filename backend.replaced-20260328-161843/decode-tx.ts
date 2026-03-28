import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTx() {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const txHash = '0xadf7e174f19df5b4143d34d495f77109fdf01f0e00c8a794fd7cba04e6111f90';
  
  const tx = await provider.getTransaction(txHash);
  
  if (tx && tx.data) {
    // 解码函数调用
    const iface = new ethers.Interface(['function withdraw(uint256 amount)']);
    const decoded = iface.parseTransaction({ data: tx.data });
    
    console.log('函数:', decoded?.name);
    console.log('参数 amount:', ethers.formatUnits(decoded?.args[0], 6), 'USDT');
  }
}

checkTx();
