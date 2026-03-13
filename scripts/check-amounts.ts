import { ethers } from 'hardhat';

async function main() {
  const stakingAddress = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
  const testAddress = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
  
  const staking = await ethers.getContractAt('StakingContract', stakingAddress);
  
  console.log('=== 灵活期完整金额 ===');
  const usdtTotal = await staking.usdtFlexibleTotalStaked(testAddress);
  const rwaTotal = await staking.rwaFlexibleTotalStaked(testAddress);
  console.log('USDT TotalStaked:', usdtTotal.toString(), '=', ethers.formatUnits(usdtTotal, 18));
  console.log('RWA TotalStaked:', rwaTotal.toString(), '=', ethers.formatUnits(rwaTotal, 18));
  
  console.log('\n=== 首次质押时间 ===');
  const userInfo = await staking.users(testAddress);
  const rwaInfo = await staking.rwaStakes(testAddress);
  console.log('USDT firstStakeTime:', userInfo.firstStakeTime.toString());
  console.log('RWA firstStakeTime:', rwaInfo.firstStakeTime.toString());
  
  console.log('\n=== RWA 锁仓[0] ===');
  const locked = await staking.rwaLockedPrincipals(testAddress, 0);
  console.log('stakeId:', locked.stakeId.toString());
  console.log('totalAmount:', locked.totalAmount.toString(), '=', ethers.formatUnits(locked.totalAmount, 18));
  console.log('principalAmount:', locked.principalAmount.toString(), '=', ethers.formatUnits(locked.principalAmount, 18));
  console.log('lockStartTime:', locked.lockStartTime.toString(), '=', new Date(Number(locked.lockStartTime) * 1000).toISOString());
}

main().catch(console.error);
