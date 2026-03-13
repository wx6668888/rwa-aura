import { ethers } from 'hardhat';

async function main() {
  const stakingAddress = '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE';
  const testAddress = '0xCC99BAaEcdD41B457850Aec1cE6EaCb38E9a19e4';
  
  const staking = await ethers.getContractAt('StakingContract', stakingAddress);
  
  console.log('=== 灵活期余额 ===');
  const usdtFlexible = await staking.usdtFlexiblePrincipal(testAddress);
  const rwaFlexible = await staking.rwaFlexiblePrincipal(testAddress);
  console.log('USDT 灵活:', ethers.formatUnits(usdtFlexible, 18));
  console.log('RWA 灵活:', ethers.formatUnits(rwaFlexible, 18));
  
  console.log('\n=== USDT 锁仓数组 ===');
  for (let i = 0; i < 3; i++) {
    try {
      const locked = await staking.usdtLockedPrincipals(testAddress, i);
      if (locked.principalAmount > 0n) {
        console.log(`[${i}] stakeId:`, locked.stakeId.toString());
        console.log(`    金额:`, ethers.formatUnits(locked.principalAmount, 18));
        console.log(`    开始:`, new Date(Number(locked.lockStartTime) * 1000).toISOString());
        console.log(`    结束:`, new Date(Number(locked.lockEndTime) * 1000).toISOString());
      }
    } catch (e: any) {
      console.log(`[${i}] 无数据`);
    }
  }
  
  console.log('\n=== RWA 锁仓数组 ===');
  for (let i = 0; i < 3; i++) {
    try {
      const locked = await staking.rwaLockedPrincipals(testAddress, i);
      if (locked.principalAmount > 0n) {
        console.log(`[${i}] stakeId:`, locked.stakeId.toString());
        console.log(`    金额:`, ethers.formatUnits(locked.principalAmount, 18));
        console.log(`    开始:`, new Date(Number(locked.lockStartTime) * 1000).toISOString());
        console.log(`    结束:`, new Date(Number(locked.lockEndTime) * 1000).toISOString());
      }
    } catch (e: any) {
      console.log(`[${i}] 无数据`);
    }
  }
}

main().catch(console.error);
