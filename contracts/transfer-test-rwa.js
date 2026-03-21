const { ethers } = require('ethers');

async function transferToTest() {
  const RPC_URL = 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = '0x72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200';
  const RWA_TOKEN = '0x0B4f2Ca412466fDBf7B0691Ca6F5b51A197f4812';
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
