import { ethers } from "hardhat";

async function main() {
  const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS || "0x59b670e9fA9D0A427751Af201D676719a970857b";
  
  console.log("=".repeat(60));
  console.log("📋 Contract Information");
  console.log("=".repeat(60));
  console.log("\nStakingContract:", stakingContractAddress);
  
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = StakingContract.attach(stakingContractAddress);
  
  // 读取合约中的地址
  const usdtToken = await stakingContract.usdtToken();
  const rwaToken = await stakingContract.rwaToken();
  
  console.log("USDT Token:", usdtToken);
  console.log("RWA Token:", rwaToken);
  console.log("");
  
  // 验证 TestUSDT
  try {
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    const testUSDT = TestUSDT.attach(usdtToken);
    const name = await testUSDT.name();
    const symbol = await testUSDT.symbol();
    console.log("✅ TestUSDT verified:");
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
  } catch (error) {
    console.log("⚠️  Could not verify TestUSDT");
  }
  
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
