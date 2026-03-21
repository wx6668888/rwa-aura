const { ethers } = require('ethers');
require('dotenv').config();

(async () => {
  // 生成新账号
  const wallet = ethers.Wallet.createRandom();
  
  console.log('=== 新测试账号 ===');
  console.log('地址:', wallet.address);
  console.log('私钥:', wallet.privateKey);
  console.log('');
  
  // 连接到BSC测试网
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const ownerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
  
  const USDT_TOKEN = process.env.USDT_TOKEN_ADDRESS;
  const RWA_TOKEN = process.env.RWA_TOKEN_ADDRESS;
  
  const tokenABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)'
  ];
  
  const usdtContract = new ethers.Contract(USDT_TOKEN, tokenABI, ownerWallet);
  const rwaContract = new ethers.Contract(RWA_TOKEN, tokenABI, ownerWallet);
  
  console.log('开始转账...');
  
  // 转账10000 USDT
  console.log('转账 10,000 USDT...');
  const usdtAmount = ethers.parseUnits('10000', 18);
  const usdtTx = await usdtContract.transfer(wallet.address, usdtAmount);
  await usdtTx.wait();
  console.log('✅ USDT转账成功:', usdtTx.hash);
  
  // 转账10000 RWA
  console.log('转账 10,000 RWA...');
  const rwaAmount = ethers.parseUnits('10000', 18);
  const rwaTx = await rwaContract.transfer(wallet.address, rwaAmount);
  await rwaTx.wait();
  console.log('✅ RWA转账成功:', rwaTx.hash);
  
  console.log('');
  console.log('=== 充值完成 ===');
  console.log('地址:', wallet.address);
  console.log('USDT余额: 10,000');
  console.log('RWA余额: 10,000');
})();
