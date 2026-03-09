import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer, user] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("🔄 Testing Swap Functionality");
  console.log("=".repeat(60));
  console.log("\nDeployer:", deployer.address);
  console.log("User:", user.address);
  console.log("");
  
  // 获取合约地址（使用最新部署地址）
  const swapContractAddress = process.env.SWAP_CONTRACT_ADDRESS || "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
  const stRWAAddress = process.env.ST_RWA_ADDRESS || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
  const rwaTokenAddress = process.env.RWA_TOKEN_ADDRESS || "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  
  // 获取合约实例
  const SwapContract = await ethers.getContractFactory("SwapContract");
  const swapContract = SwapContract.attach(swapContractAddress);
  
  const StRWA = await ethers.getContractFactory("StRWA");
  const stRWA = StRWA.attach(stRWAAddress);
  
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = RWAToken.attach(rwaTokenAddress);
  
  console.log("📦 Step 1: Checking pool status...");
  const poolStatus = await swapContract.getPoolStatus();
  console.log("RWA Pool Balance:", ethers.formatEther(poolStatus[0]), "RWA");
  console.log("stRWA Pool Balance:", ethers.formatEther(poolStatus[1]), "stRWA");
  console.log("Swap Rate:", poolStatus[2].toString(), "(100 = 1:1)");
  console.log("");
  
  // 检查用户 stRWA 余额
  const userStRWABalance = await stRWA.balanceOf(user.address);
  console.log("📦 Step 2: Checking user balances...");
  console.log("User stRWA balance:", ethers.formatEther(userStRWABalance), "stRWA");
  console.log("User RWA balance:", ethers.formatEther(await rwaToken.balanceOf(user.address)), "RWA");
  console.log("");
  
  if (userStRWABalance > 0) {
    console.log("📦 Step 3: Testing stRWA → RWA swap...");
    const swapAmount = userStRWABalance / 2n; // 交换一半
    
    if (swapAmount > 0 && poolStatus[0] >= swapAmount) {
      await stRWA.connect(user).approve(swapContractAddress, swapAmount);
      
      console.log("   - Swapping", ethers.formatEther(swapAmount), "stRWA to RWA...");
      const tx = await swapContract.connect(user).swapStRWAToRWA(swapAmount);
      await tx.wait();
      
      console.log("✅ Swap successful!");
      console.log("   User stRWA balance:", ethers.formatEther(await stRWA.balanceOf(user.address)), "stRWA");
      console.log("   User RWA balance:", ethers.formatEther(await rwaToken.balanceOf(user.address)), "RWA");
    } else {
      console.log("⚠️  Cannot swap: insufficient balance or pool");
    }
    console.log("");
  }
  
  // 测试 RWA → stRWA
  const userRWABalance = await rwaToken.balanceOf(user.address);
  if (userRWABalance > 0) {
    console.log("📦 Step 4: Testing RWA → stRWA swap...");
    const swapAmount = userRWABalance / 2n; // 交换一半
    
    if (swapAmount > 0 && poolStatus[1] >= swapAmount) {
      await rwaToken.connect(user).approve(swapContractAddress, swapAmount);
      
      console.log("   - Swapping", ethers.formatEther(swapAmount), "RWA to stRWA...");
      const tx = await swapContract.connect(user).swapRWAToStRWA(swapAmount);
      await tx.wait();
      
      console.log("✅ Swap successful!");
      console.log("   User stRWA balance:", ethers.formatEther(await stRWA.balanceOf(user.address)), "stRWA");
      console.log("   User RWA balance:", ethers.formatEther(await rwaToken.balanceOf(user.address)), "RWA");
    } else {
      console.log("⚠️  Cannot swap: insufficient balance or pool");
    }
    console.log("");
  }
  
  // 最终状态
  console.log("📦 Step 5: Final pool status...");
  const finalPoolStatus = await swapContract.getPoolStatus();
  console.log("RWA Pool Balance:", ethers.formatEther(finalPoolStatus[0]), "RWA");
  console.log("stRWA Pool Balance:", ethers.formatEther(finalPoolStatus[1]), "stRWA");
  console.log("");
  
  console.log("=".repeat(60));
  console.log("✅ Swap test completed!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  });
