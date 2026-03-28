const { ethers } = require('ethers');

const address = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

(async () => {
  const provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
  
  console.log('=== BSC主网 - Owner地址余额检查 ===');
  console.log('地址:', address);
  console.log('');
  
  // 获取BNB余额
  const balance = await provider.getBalance(address);
  console.log('BNB余额:', ethers.formatEther(balance), 'BNB');
  
  if (balance === 0n) {
    console.log('⚠️ BNB余额为0，无法发送交易！');
  } else if (balance < ethers.parseEther('0.01')) {
    console.log('⚠️ BNB余额较低，建议充值');
  }
  
  // 获取交易数量
  const txCount = await provider.getTransactionCount(address);
  console.log('已发送交易数:', txCount);
})();
