const { ethers } = require('ethers');
require('dotenv').config();

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
  
  console.log('=== 检查后端钱包余额 ===\n');
  console.log('钱包地址:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('BNB余额:', ethers.formatEther(balance), 'BNB');
  
  if (balance === 0n) {
    console.log('\n❌ 钱包没有BNB！无法支付Gas费！');
    console.log('请向该地址转入一些测试BNB：', wallet.address);
  } else {
    console.log('\n✅ 钱包有足够的BNB支付Gas费');
  }
})();
