import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🔍 Finding TestUSDT contract address...");
  console.log("Deployer:", deployer.address);
  console.log("");
  
  // 尝试从 StakingContract 获取 USDT 地址
  const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS || "0x59b670e9fA9D0A427751Af201D676719a970857b";
  
  try {
    const StakingContract = await ethers.getContractFactory("StakingContract");
    const stakingContract = StakingContract.attach(stakingContractAddress);
    
    // 读取 usdtToken 地址（如果是 public）
    const usdtAddress = await stakingContract.usdtToken();
    console.log("✅ USDT Token Address from StakingContract:", usdtAddress);
    
    // 验证是否是 TestUSDT
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    const testUSDT = TestUSDT.attach(usdtAddress);
    const name = await testUSDT.name();
    const symbol = await testUSDT.symbol();
    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    
    if (name === "Test USDT" || symbol === "USDT") {
      console.log("✅ This is TestUSDT contract!");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.log("\nTrying to deploy new TestUSDT...");
    
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    const testUSDT = await TestUSDT.deploy();
    await testUSDT.waitForDeployment();
    const address = await testUSDT.getAddress();
    console.log("✅ New TestUSDT deployed to:", address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
