const { ethers } = require("hardhat");

async function main() {
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  const user = "0x0254ecc9d2dca521ed954d8eaeedb610fb9d85da";
  const amount = ethers.parseEther("2352");
  const now = Math.floor(Date.now()/1000);
  
  const userInfo = {
    totalStaked: 0,
    rwaPending: 0,
    usdtRewards: 0,
    lastWithdrawTime: 0,
    referrer: ethers.ZeroAddress,
    firstStakeTime: now,
    nodeLevel: 1,
    isActive: true
  };
  
  const rwaInfo = {
    totalStakedRWA: amount,
    rwaPending: 0,
    lastWithdrawTime: 0,
    referrer: ethers.ZeroAddress,
    firstStakeTime: now,
    nodeLevel: 1,
    isActive: true
  };
  
  const rwaLocks = [{
    stakeId: 20,
    totalAmount: amount,
    principalAmount: amount,
    lockStartTime: now,
    lockEndTime: 1781830822,
    isWithdrawn: false,
    lockPeriod: 90
  }];
  
  console.log("导入:", user);
  
  const tx = await staking.migrationImportUserBundle(
    user, userInfo, rwaInfo, [], rwaLocks, 0, 0, 0, 0, [], 0, amount
  );
  
  await tx.wait();
  console.log("✅ 成功");
}

main().catch(console.error);
