const { ethers } = require('ethers');

const address = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

(async () => {
  const provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
  
  console.log('=== 查询主网交易详情 ===');
  console.log('地址:', address);
  console.log('');
  
  const txCount = await provider.getTransactionCount(address);
  console.log('总交易数:', txCount);
  console.log('');
  
  // 获取当前余额
  const balance = await provider.getBalance(address);
  console.log('当前BNB余额:', ethers.formatEther(balance), 'BNB');
  console.log('');
  
  console.log('由于RPC限制，无法直接获取历史交易详情。');
  console.log('');
  console.log('请访问 BSCScan 查看完整交易历史：');
  console.log(`https://bscscan.com/address/${address}`);
  console.log('');
  console.log('在BSCScan上可以看到：');
  console.log('- 每笔交易的时间');
  console.log('- 发送方和接收方地址');
  console.log('- 转账金额');
  console.log('- Gas费用');
  console.log('- 交易状态');
})();
