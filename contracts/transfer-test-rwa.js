const { ethers } = require('ethers');
const { getDeployPrivateKey } = require('./load-deploy-key');

async function transferToTest() {
  const RPC_URL = 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = getDeployPrivateKey();
  const RWA_TOKEN = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
  const TEST_ADDRESS = '0x77ee3f51F9e0C5C99DB8EF9451Eee1a382f7A340';
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const tokenABI = ['function transfer(address to, uint256 amount) returns (bool)'];
  const rwaToken = new ethers.Contract(RWA_TOKEN, tokenABI, wallet);
  
  console.log('转账10,000 RWA到测试账户...');
  console.log('接收地址:', TEST_ADDRESS);
  
  const tx = await rwaToken.transfer(TEST_ADDRESS, ethers.parseEther('10000'));
  console.log('交易哈希:', tx.hash);
  await tx.wait();
  console.log('✅ 转账成功');
}

transferToTest().then(() => process.exit(0)).catch(console.error);
