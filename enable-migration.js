const { ethers } = require("hardhat");

async function main() {
  console.log("=== 启用迁移模式 ===\n");
  
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  console.log("启用迁移模式...");
  const tx = await staking.setMigrationEnabled(true);
  await tx.wait();
  console.log("✅ 迁移模式已启用");
  
  const enabled = await staking.migrationEnabled();
  console.log("验证:", enabled);
}

main().catch(console.error);
