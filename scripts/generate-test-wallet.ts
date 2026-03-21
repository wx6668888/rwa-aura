import { ethers } from 'hardhat';

async function main() {
  // 生成新的测试钱包
  const wallet = ethers.Wallet.createRandom();
  
  console.log('新测试地址:');
  console.log('  地址:', wallet.address);
  console.log('  私钥:', wallet.privateKey);
  console.log('\n请保存这些信息！');
  console.log('\n下一步：');
  console.log('1. 在 MetaMask 中导入这个私钥');
  console.log('2. 运行脚本给这个地址发送测试币');
}

main().catch(console.error);
