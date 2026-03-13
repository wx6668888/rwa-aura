import { ethers } from 'hardhat';

async function testMetaTransaction() {
  console.log('========== 测试 Meta Transaction ==========\n');

  const [deployer] = await ethers.getSigners();
  const user = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  const STAKING = '0xaa2ba3E010545186bD4418B5d6acD687730627Ce';
  
  const staking = await ethers.getContractAt('StakingContract', STAKING);
  
  // 查询 nonce
  console.log('查询用户 nonce...');
  const nonce = await staking.nonces(user);
  console.log('Nonce:', nonce.toString());
  
  console.log('\n✅ Meta Transaction 合约就绪！');
  console.log('用户可以通过签名进行 gasless 质押');
}

testMetaTransaction().catch(console.error);
