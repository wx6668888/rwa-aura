const { ethers } = require("hardhat");

async function main() {
  console.log("=== 批量导入用户数据 ===\n");
  
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  // 测试导入第1个用户
  const user1 = "0x0254ecc9d2dca521ed954d8eaeedb610fb9d85da";
  
  console.log("导入用户:", user1);
  
  // UserInfo结构
  const userInfo = {
    totalStaked: 0,
    totalStakedRWA: ethers.parseEther("2352"),
    referrer: ethers.ZeroAddress,
    userLevel: 1,
    lastClaimTime: 0
  };
  
  // RWA锁定本金
  const rwaLocks = [{
    stakeId: 20,
    principal: ethers.parseEther("2352"),
    lockPeriod: 90 * 24 * 3600,
    lockEndTime: 1781830822
  }];
  
  const tx = await staking.migrationImportUser(
    user1,
    userInfo,
    [], // usdtLocks
    rwaLocks,
    0, // usdtFlexPrincipal
    0, // rwaFlexPrincipal
    [] // stakeHistory
  );
  
  await tx.wait();
  console.log("✅ 用户1导入成功");
}

main().catch(console.error);
