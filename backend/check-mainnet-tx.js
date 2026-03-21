const { ethers } = require('ethers');

const address = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

(async () => {
  const provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
  
  console.log('=== BSC主网 - 最近交易记录 ===');
  console.log('地址:', address);
  console.log('');
  
  const txCount = await provider.getTransactionCount(address);
  console.log('总交易数:', txCount);
  console.log('');
  
  // 获取最新区块号
  const latestBlock = await provider.getBlockNumber();
  console.log('当前区块:', latestBlock);
  console.log('');
  
  console.log('查询最近的交易...');
  console.log('（注意：需要使用区块浏览器API才能获取完整历史）');
  console.log('');
  console.log('建议访问 BSCScan 查看完整交易历史：');
  console.log(`https://bscscan.com/address/${address}`);
})();
