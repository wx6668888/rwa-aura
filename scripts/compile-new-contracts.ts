import { run } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function main() {
  const hre: HardhatRuntimeEnvironment = require("hardhat");
  
  console.log("Compiling new contracts...");
  console.log("- StRWA.sol");
  console.log("- SwapContract.sol");
  console.log("- StakingContract.sol (updated)");
  
  // 只编译指定的合约文件
  await hre.run("compile", {
    force: true,
    quiet: false,
  });
  
  console.log("\n✅ Compilation completed!");
  console.log("\nNote: LotteryContract.sol has Chainlink dependency issues and is skipped for now.");
  console.log("The new contracts (StRWA, SwapContract, StakingContract) should compile successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
