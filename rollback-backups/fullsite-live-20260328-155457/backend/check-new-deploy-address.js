const { ethers } = require('ethers');

const newAddress = '0x8927e74e0fCaED1D4C87116C805464800651f222';
const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

(async () => {
  const provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
  
  console.log('=== 新部署地址检查 ===');
  console.log('地址:', newAddress);
  console.log('');
  
  // 获取BNB余额
  const balance = await provider.getBalance(newAddress);
  console.log('BNB余额:', ethers.formatEther(balance), 'BNB');
  
  // 获取交易数量
  const txCount = await provider.getTransactionCount(newAddress);
  console.log('交易数量:', txCount);
  
  // 检查是否是合约
  const code = await provider.getCode(newAddress);
  const isContract = code !== '0x';
  console.log('是否是合约:', isContract ? '是' : '否');
  
  console.log('');
  if (balance < ethers.parseEther('0.001')) {
    console.log('⚠️ BNB余额不足，建议充值至少0.001 BNB用于部署');
  } else {
    console.log('✅ BNB余额充足，可以开始部署');
  }
})();
