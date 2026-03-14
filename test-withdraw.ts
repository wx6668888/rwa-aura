import { ethers } from 'hardhat';

async function testWithdraw() {
  const poolAddress = '0xEB2c7bACC5d6FAB553e65B7162aA3B84db977E32';
  const userAddress = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
  
  const pool = await ethers.getContractAt('ReferralRewardPool', poolAddress);
  
  const balance = await pool.withdrawableBalance(userAddress);
  console.log('可提取余额:', ethers.formatUnits(balance, 6));
  
  // 尝试提现
  try {
    const tx = await pool.withdraw(ethers.parseUnits('100', 6));
    await tx.wait();
    console.log('✅ 提现成功');
  } catch (error: any) {
    console.log('❌ 提现失败:', error.message);
  }
}

testWithdraw();
