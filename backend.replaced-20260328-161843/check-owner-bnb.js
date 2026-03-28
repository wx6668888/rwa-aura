const { ethers } = require('ethers');
require('dotenv').config();

const address = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  
  console.log('=== Owner地址余额检查 ===');
  console.log('地址:', address);
  console.log('');
  
  // 获取BNB余额
  const balance = await provider.getBalance(address);
  console.log('BNB余额:', ethers.formatEther(balance), 'BNB');
  
  if (balance === 0n) {
    console.log('⚠️ BNB余额为0，无法发送交易！');
  }
  
  // 获取交易数量
  const txCount = await provider.getTransactionCount(address);
  console.log('已发送交易数:', txCount);
})();
