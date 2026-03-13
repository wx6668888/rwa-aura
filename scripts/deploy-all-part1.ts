import { ethers } from 'hardhat';

async function deployAll() {
  console.log('========== 部署所有合约到 BSC 测试网 ==========\n');

  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);
  console.log('账户余额:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'BNB\n');

  // 1. TestUSDT
  console.log('1. 部署 TestUSDT...');
  const TestUSDT = await ethers.getContractFactory('TestUSDT');
  const usdt = await TestUSDT.deploy();
  await usdt.waitForDeployment();
  console.log('✅ TestUSDT:', await usdt.getAddress());

  // 2. RWAToken
  console.log('\n2. 部署 RWAToken...');
  const RWAToken = await ethers.getContractFactory('RWAToken');
  const rwa = await RWAToken.deploy(
    'RWA Token',
    'RWA',
    ethers.parseEther('1000000000'),
    deployer.address,
    deployer.address
  );
  await rwa.waitForDeployment();
  console.log('✅ RWAToken:', await rwa.getAddress());

  // 3. StRWA
  console.log('\n3. 部署 StRWA...');
  const StRWA = await ethers.getContractFactory('StRWA');
  const strwa = await StRWA.deploy();
  await strwa.waitForDeployment();
  console.log('✅ StRWA:', await strwa.getAddress());

  // 4. StakingContract
  console.log('\n4. 部署 StakingContract...');
  const Staking = await ethers.getContractFactory('StakingContract');
  const staking = await Staking.deploy(
    await usdt.getAddress(),
    await rwa.getAddress(),
    deployer.address,
    deployer.address
  );
  await staking.waitForDeployment();
  console.log('✅ StakingContract:', await staking.getAddress());

  // 配置 StRWA
  console.log('\n5. 配置 StRWA...');
  await strwa.setStakingContract(await staking.getAddress());
  await staking.setStRWAToken(await strwa.getAddress());
  console.log('✅ StRWA 配置完成');

  // 6. SwapContract
  console.log('\n6. 部署 SwapContract...');
  const Swap = await ethers.getContractFactory('SwapContract');
  const swap = await Swap.deploy(
    await rwa.getAddress(),
    await strwa.getAddress()
  );
  await swap.waitForDeployment();
  console.log('✅ SwapContract:', await swap.getAddress());

  console.log('\n========== 第一批部署完成 ==========');
  console.log('继续部署剩余合约...\n');
}

deployAll().catch(console.error);
