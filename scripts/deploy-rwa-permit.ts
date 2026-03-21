import { ethers } from 'hardhat';

async function main() {
  console.log('======== 部署 RWA Token (支持 Permit) ========\n');
  
  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);
  
  // 1. 部署 RWA Token
  console.log('\n1. 部署 RWATokenWithPermit...');
  const RWAToken = await ethers.getContractFactory('RWATokenWithPermit');
  const rwaToken = await RWAToken.deploy();
  await rwaToken.waitForDeployment();
  const rwaAddress = await rwaToken.getAddress();
  console.log('✅ RWA Token:', rwaAddress);
  
  // 2. 添加 StakingContract 到白名单
  const stakingAddress = '0xD130d5DAadD8Bfb3E15c51786f40B262bE2E7fCA';
  console.log('\n2. 添加 StakingContract 到白名单...');
  await rwaToken.addToWhitelist(stakingAddress);
  console.log('✅ StakingContract 已加入白名单');
  
  // 3. 铸造测试代币
  const testUser = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  console.log('\n3. 铸造测试代币...');
  await rwaToken.mint(testUser, ethers.parseEther('10000'));
  console.log('✅ 已铸造 10,000 RWA 给测试用户');
  
  console.log('\n======== 部署完成 ========');
  console.log('RWA Token (Permit):', rwaAddress);
  console.log('测试用户:', testUser);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
