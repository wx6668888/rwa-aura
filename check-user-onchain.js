const { ethers } = require("hardhat");

async function main() {
  const stakingAddress = "0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175";
  const userAddress = "0x4DF0245b922f03A1Ab20e67c1A4cDA4807eac0Fc";
  
  const staking = await ethers.getContractAt("StakingContract", stakingAddress);
  
  console.log("=== 用户链上数据查询 ===");
  console.log("合约地址:", stakingAddress);
  console.log("用户地址:", userAddress);
  console.log("");
  
  // 查询用户基本信息
  const userInfo = await staking.users(userAddress);
  console.log("--- 用户基本信息 ---");
  console.log("总质押USDT:", ethers.formatUnits(userInfo.totalStaked, 6), "USDT");
  console.log("总质押RWA:", ethers.formatEther(userInfo.totalStakedRWA), "RWA");
  console.log("推荐人:", userInfo.referrer);
  console.log("用户等级:", userInfo.userLevel.toString());
  console.log("");
  
  // 查询RWA质押信息
  const rwaStake = await staking.rwaStakes(userAddress);
  console.log("--- RWA质押信息 ---");
  console.log("灵活质押:", ethers.formatEther(rwaStake.flexibleAmount), "RWA");
  console.log("锁定质押:", ethers.formatEther(rwaStake.lockedAmount), "RWA");
  console.log("累计收益:", ethers.formatEther(rwaStake.totalRewards), "RWA");
  console.log("");
  
  // 查询锁定本金
  const rwaLockedPrincipals = await staking.rwaLockedPrincipals(userAddress, 0);
  console.log("--- 锁定本金详情 ---");
  console.log("质押ID:", rwaLockedPrincipals.stakeId.toString());
  console.log("本金:", ethers.formatEther(rwaLockedPrincipals.principal), "RWA");
  console.log("锁定期:", rwaLockedPrincipals.lockPeriod.toString(), "秒");
  console.log("到期时间:", new Date(Number(rwaLockedPrincipals.lockEndTime) * 1000).toLocaleString());
}

main().catch(console.error);
