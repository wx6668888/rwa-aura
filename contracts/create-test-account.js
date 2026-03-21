const { ethers } = require('ethers');

async function createTestAccount() {
  // 生成新的测试账户
  const testWallet = ethers.Wallet.createRandom();
  
  console.log('=== 测试账户信息 ===');
  console.log('地址:', testWallet.address);
  console.log('私钥:', testWallet.privateKey);
  console.log('助记词:', testWallet.mnemonic.phrase);
  console.log('');
  
  // 连接到BSC主网
  const RPC_URL = 'https://bsc-dataseed.binance.org/';
  const DEPLOYER_PRIVATE_KEY = '0x72de45eab3e0f215109b5beb29a62188d7784542aab9b72eeb4f82a8b8c69200';
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  
  console.log('从部署地址转入BNB...');
  console.log('部署地址:', deployer.address);
  
  // 转入0.01 BNB用于gas费
  const tx = await deployer.sendTransaction({
    to: testWallet.address,
    value: ethers.parseEther('0.01')
  });
  
  console.log('交易哈希:', tx.hash);
  await tx.wait();
  console.log('✅ 转账成功');
  console.log('');
  
  // 检查余额
  const balance = await provider.getBalance(testWallet.address);
  console.log('测试账户BNB余额:', ethers.formatEther(balance), 'BNB');
  console.log('');
  
  console.log('=== 测试说明 ===');
  console.log('1. 测试账户已有0.01 BNB用于gas费');
  console.log('2. 需要向测试账户转入USDT才能测试质押');
  console.log('3. 主网USDT地址: 0x55d398326f99059fF775485246999027B3197955');
  console.log('4. 建议转入100-1000 USDT进行测试');
  console.log('');
  console.log('⚠️ 请妥善保管私钥和助记词！');
}

createTestAccount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('错误:', error);
    process.exit(1);
  });
