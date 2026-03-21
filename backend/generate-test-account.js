const { ethers } = require('ethers');

console.log('=== 生成BSC测试网账号 ===');
console.log('');

// 生成新钱包
const wallet = ethers.Wallet.createRandom();

console.log('地址:', wallet.address);
console.log('私钥:', wallet.privateKey);
console.log('');
console.log('⚠️ 请妥善保管私钥！');
console.log('');
console.log('下一步:');
console.log('1. 访问 https://testnet.bnbchain.org/faucet-smart');
console.log('2. 输入地址获取测试BNB');
console.log('3. 使用MetaMask导入私钥进行测试');
