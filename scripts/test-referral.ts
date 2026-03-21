import { ethers } from 'hardhat';

async function testReferral() {
  console.log('========== 测试推荐人功能 ==========\n');

  const [deployer] = await ethers.getSigners();
  
  // 使用部署者作为推荐人
  const referrer = deployer.address;
  const user = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  console.log('用户:', user);
  console.log('推荐人:', referrer);
  
  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';
  const STAKING = '0xD2AA6CFC4409C8a7C2912B460DBC58f128D19246';
  
  // 需要用户的私钥来执行质押
  // 使用 Hardhat 本地账户模拟
  const userWallet = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    ethers.provider
  );
  
  const usdt = await ethers.getContractAt('TestUSDT', USDT, userWallet);
  const staking = await ethers.getContractAt('StakingContract', STAKING, userWallet);
  
  // 质押并绑定推荐人
  console.log('\n质押 100 USDT 并绑定推荐人...');
  const amount = ethers.parseUnits('100', 6);
  await usdt.approve(STAKING, amount);
  await staking.stake(amount, referrer, 0);
  console.log('✅ 质押成功');
  
  // 查询推荐人
  const userInfo = await staking.users(user);
  console.log('\n绑定的推荐人:', userInfo[4]);
  
  console.log('\n========== 测试完成 ==========');
}

testReferral().catch(console.error);
