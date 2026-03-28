const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("=== 部署StakingContract合约 ===\n");
  
  const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
  const rwaAddress = "0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6";
  const treasuryAddress = "0x80c992C57c6439163E14050d01d1387706a27D37";
  const backendAddress = "0x8927e74e0fCaED1D4C87116C805464800651f222";
  
  console.log("配置:");
  console.log("  USDT:", usdtAddress);
  console.log("  RWA:", rwaAddress);
  console.log("  Treasury:", treasuryAddress);
  console.log("  Backend:", backendAddress);
  
  const StakingFactory = await ethers.getContractFactory("StakingContract");
  console.log("\n正在部署StakingContract...");
  
  const staking = await StakingFactory.deploy(
    usdtAddress,
    rwaAddress,
    treasuryAddress,
    backendAddress
  );
  await staking.waitForDeployment();
  
  const stakingAddress = await staking.getAddress();
  console.log("✅ StakingContract已部署:", stakingAddress);
  
  fs.writeFileSync('/tmp/staking-address.txt', stakingAddress);
}

main().catch(console.error);
