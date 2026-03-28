const { ethers } = require("hardhat");

async function main() {
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  const user = "0x0254ecc9d2dca521ed954d8eaeedb610fb9d85da";
  const amount = "2352000000000000000000";
  const now = Math.floor(Date.now()/1000);
  
  const userInfo = [0, 0, 0, 0, ethers.ZeroAddress, now, 1, true];
  const rwaInfo = [amount, 0, 0, ethers.ZeroAddress, now, 1, true];
  
  // RWALockedPrincipal: stakeId, totalAmount, principalAmount, lockStartTime, lockEndTime
  const rwaLocks = [[20, amount, amount, now, 1781830822]];
  
  console.log("导入:", user);
  
  const tx = await staking.migrationImportUserBundle(
    user, userInfo, rwaInfo, [], rwaLocks, 0, 0, 0, 0, [], 0, amount
  );
  
  await tx.wait();
  console.log("✅ 成功");
}

main().catch(console.error);
