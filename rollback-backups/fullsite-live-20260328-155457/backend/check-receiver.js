const { ethers } = require('ethers');

const targetAddress = '0xeeeee90971B6264C53175D3Af6840a8dD5dc7b6C';
const treasuryAddress = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

(async () => {
  const provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
  
  console.log('=== BSC主网 - 接收地址检查 ===');
  console.log('接收地址:', targetAddress);
  console.log('');
  
  // 获取BNB余额
  const balance = await provider.getBalance(targetAddress);
  console.log('BNB余额:', ethers.formatEther(balance), 'BNB');
  
  // 获取交易数量
  const txCount = await provider.getTransactionCount(targetAddress);
  console.log('交易数量:', txCount);
  
  // 检查是否是合约
  const code = await provider.getCode(targetAddress);
  const isContract = code !== '0x';
  console.log('是否是合约:', isContract ? '是' : '否');
  
  console.log('');
  console.log('查看从国库地址到此地址的转账：');
  console.log(`https://bscscan.com/address/${treasuryAddress}`);
})();
