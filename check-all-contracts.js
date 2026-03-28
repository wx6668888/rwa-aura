const { ethers } = require("hardhat");

async function main() {
  console.log("=== 检查所有已部署合约 ===\n");
  
  // 1. StakingContract
  const stakingAddr = "0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  console.log("1. StakingContract:", stakingAddr);
  const stakingOwner = await staking.owner();
  const backendAddr = await staking.backendAddress();
  const treasuryAddr = await staking.treasuryAddress();
  console.log("   owner:", stakingOwner);
  console.log("   backendAddress:", backendAddr);
  console.log("   treasuryAddress:", treasuryAddr);
  
  // 2. RWAToken
  const rwaAddr = "0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6";
  const rwa = await ethers.getContractAt("RWAToken", rwaAddr);
  
  console.log("\n2. RWAToken:", rwaAddr);
  const rwaOwner = await rwa.owner();
  console.log("   owner:", rwaOwner);
  
  // 3. TreasuryContract
  const treasuryContractAddr = "0x80c992C57c6439163E14050d01d1387706a27D37";
  const treasury = await ethers.getContractAt("TreasuryContract", treasuryContractAddr);
  
  console.log("\n3. TreasuryContract:", treasuryContractAddr);
  const treasuryOwner = await treasury.owner();
  console.log("   owner:", treasuryOwner);
}

main().catch(console.error);
