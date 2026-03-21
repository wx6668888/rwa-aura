import { ethers } from 'hardhat';

async function testAllContracts() {
  console.log('========== 测试所有合约功能 ==========\n');

  const [user] = await ethers.getSigners();
  
  const USDT = '0x7f25Fa092554e69f6ecb855D1047f6cFf9bB879c';
  const RWA = '0xe3a80F459B9C5000Bf8C1eeD38Ac187eCdf277be';
  const TREASURY = '0xf4538Aaf01674eDDFFf94b59eBA232AEdA96Dc35';
  const STABILIZER = '0x2F3520dc4e8E1031e61FFf6bea783c65ECa47001';
  const LIQUIDITY = '0x4427D81e365fD65f620A96559F040Dc25Dac9636';

  // 测试 1: Treasury
  console.log('【测试 1】TreasuryContract');
  const treasury = await ethers.getContractAt('TreasuryContract', TREASURY);
  const treasuryBal = await treasury.getTreasuryBalance();
  console.log('国库余额:', ethers.formatUnits(treasuryBal, 6), 'USDT');

  // 测试 2: PriceStabilizer
  console.log('\n【测试 2】PriceStabilizer');
  const stabilizer = await ethers.getContractAt('PriceStabilizer', STABILIZER);
  const targetPrice = await stabilizer.targetPrice();
  console.log('目标价格:', ethers.formatEther(targetPrice), 'USDT');

  // 测试 3: LiquidityManager
  console.log('\n【测试 3】LiquidityManager');
  const liquidity = await ethers.getContractAt('LiquidityManager', LIQUIDITY);
  const minRatio = await liquidity.minLiquidityRatio();
  console.log('最低流动性比例:', minRatio.toString(), '%');

  console.log('\n========== 测试完成 ==========');
}

testAllContracts().catch(console.error);
