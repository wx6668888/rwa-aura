const { ethers } = require("hardhat");

async function main() {
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  console.log("关闭迁移模式...");
  const tx = await staking.setMigrationEnabled(false);
  await tx.wait();
  console.log("✅ 迁移模式已关闭");
}

main().catch(console.error);
