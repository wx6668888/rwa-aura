const { ethers } = require("hardhat");

async function main() {
  console.log("=== 配置合约关联 ===\n");
  
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const stRWAAddr = "0x7c3017dDB9eC740918689aFE44f5B645899203ff";
  const referralAddr = "0x47E7141D706a75f9e18714249fc206117a84A0e3";
  
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  const stRWA = await ethers.getContractAt("StRWA", stRWAAddr);
  
  console.log("1. 设置StRWA的StakingContract...");
  let tx = await stRWA.setStakingContract(stakingAddr);
  await tx.wait();
  console.log("✅ 完成");
  
  console.log("\n2. 设置Staking的StRWA...");
  tx = await staking.setStRWAToken(stRWAAddr);
  await tx.wait();
  console.log("✅ 完成");
  
  console.log("\n3. 设置Staking的ReferralRewardPool...");
  tx = await staking.setReferralRewardPool(referralAddr);
  await tx.wait();
  console.log("✅ 完成");
  
  console.log("\n✅ 所有配置完成！");
}

main().catch(console.error);
