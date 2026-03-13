import { ethers } from 'hardhat';

async function fullTest() {
  console.log('========== 完整功能测试 ==========\n');

  const [user] = await ethers.getSigners();
  console.log('测试账户:', user.address);

  // 合约地址
  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';
  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const STAKING = '0xD2AA6CFC4409C8a7C2912B460DBC58f128D19246';
  const STRWA = '0xfF1C231c2810F58BD568252B74557b2Df242d209';
  const SWAP = '0x2Ca00C9D6e1d304317a40Efe09CB426cE2B43567';

  // 连接合约
  const usdt = await ethers.getContractAt('TestUSDT', USDT);
  const rwa = await ethers.getContractAt('RWAToken', RWA);
  const staking = await ethers.getContractAt('StakingContract', STAKING);
  const strwa = await ethers.getContractAt('StRWA', STRWA);
  const swap = await ethers.getContractAt('SwapContract', SWAP);

  // 测试 1: 余额
  console.log('【测试 1】余额查询');
  const usdtBal = await usdt.balanceOf(user.address);
  const rwaBal = await rwa.balanceOf(user.address);
  const strwaBal = await strwa.balanceOf(user.address);
  console.log('USDT:', ethers.formatUnits(usdtBal, 6));
  console.log('RWA:', ethers.formatEther(rwaBal));
  console.log('stRWA:', ethers.formatEther(strwaBal));

  // 测试 2: 质押信息
  console.log('\n【测试 2】质押信息');
  const info = await staking.getUserStakeInfo(user.address);
  console.log('总质押:', ethers.formatEther(info[0]));
  console.log('待领取 RWA:', ethers.formatEther(info[1]));

  console.log('\n========== 第一阶段完成 ==========');
}

fullTest().catch(console.error);
