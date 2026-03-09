import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer, user] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("🧪 Testing Staking and stRWA Functionality");
  console.log("=".repeat(60));
  console.log("\nDeployer:", deployer.address);
  console.log("User:", user.address);
  console.log("");
  
  // 获取合约地址（从环境变量或使用最新部署地址）
  const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS || "0x59b670e9fA9D0A427751Af201D676719a970857b";
  const stRWAAddress = process.env.ST_RWA_ADDRESS || "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d";
  const rwaTokenAddress = process.env.RWA_TOKEN_ADDRESS || "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
  
  // 从 StakingContract 读取 USDT 地址
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContractTemp = StakingContract.attach(stakingContractAddress);
  let usdtTokenAddress = await stakingContractTemp.usdtToken();
  
  // 检查 USDT 合约是否存在
  let usdtToken;
  try {
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    usdtToken = TestUSDT.attach(usdtTokenAddress);
    await usdtToken.totalSupply(); // 测试合约是否存在
    console.log("✅ Using existing USDT at:", usdtTokenAddress);
  } catch {
    // 如果不存在，部署新的 TestUSDT
    console.log("📦 Deploying new TestUSDT...");
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    usdtToken = await TestUSDT.deploy();
    await usdtToken.waitForDeployment();
    usdtTokenAddress = await usdtToken.getAddress();
    console.log("✅ TestUSDT deployed to:", usdtTokenAddress);
    console.log("⚠️  Note: StakingContract needs to be redeployed with new USDT address");
  }
  
  console.log("Using contract addresses:");
  console.log("  StakingContract:", stakingContractAddress);
  console.log("  StRWA:", stRWAAddress);
  console.log("  RWAToken:", rwaTokenAddress);
  console.log("  USDT:", usdtTokenAddress);
  console.log("");
  
  // 获取合约实例
  const stakingContract = StakingContract.attach(stakingContractAddress);
  
  const StRWA = await ethers.getContractFactory("StRWA");
  const stRWA = StRWA.attach(stRWAAddress);
  
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = RWAToken.attach(rwaTokenAddress);
  
  console.log("📦 Step 1: Preparing test tokens...");
  
  // 给用户一些 USDT
  const mintAmount = ethers.parseUnits("10000", 6); // 10000 USDT (6 decimals)
  try {
    await usdtToken.mint(user.address, mintAmount);
    console.log("✅ User received", ethers.formatUnits(mintAmount, 6), "USDT");
  } catch (error: any) {
    console.log("ℹ️  USDT mint failed:", error.message);
    console.log("   Using existing balance");
  }
  
  // 检查用户 USDT 余额
  const userUSDTBalance = await usdtToken.balanceOf(user.address);
  console.log("User USDT balance:", ethers.formatUnits(userUSDTBalance, 6), "USDT");
  console.log("");
  
  if (userUSDTBalance < ethers.parseUnits("100", 6)) {
    console.log("⚠️  User doesn't have enough USDT for testing");
    console.log("   Please ensure user has at least 100 USDT");
    return;
  }
  
  console.log("📦 Step 2: Testing stake function...");
  
  // 用户质押 1000 USDT
  const stakeAmount = ethers.parseUnits("1000", 6);
  await usdtToken.connect(user).approve(stakingContractAddress, stakeAmount);
  
  console.log("   - User staking", ethers.formatUnits(stakeAmount, 6), "USDT...");
  const tx1 = await stakingContract.connect(user).stake(stakeAmount, ethers.ZeroAddress);
  await tx1.wait();
  console.log("✅ Stake successful!");
  console.log("");
  
  // 检查 stRWA 余额（应该收到 500 stRWA，因为 50% 转换为 stRWA）
  const userStRWABalance = await stRWA.balanceOf(user.address);
  console.log("📦 Step 3: Checking stRWA balance...");
  console.log("User stRWA balance:", ethers.formatEther(userStRWABalance), "stRWA");
  
  const expectedStRWA = ethers.parseEther("500"); // 1000 USDT * 50% = 500 stRWA
  if (userStRWABalance >= expectedStRWA) {
    console.log("✅ stRWA minted correctly!");
  } else {
    console.log("⚠️  stRWA amount may be incorrect");
  }
  console.log("");
  
  // 检查用户质押信息
  console.log("📦 Step 4: Checking user stake info...");
  const userInfo = await stakingContract.getUserStakeInfo(user.address);
  console.log("Total Staked:", ethers.formatEther(userInfo[0]), "USDT (18 decimals)");
  console.log("RWA Pending:", ethers.formatEther(userInfo[1]), "RWA");
  console.log("USDT Rewards:", ethers.formatEther(userInfo[2]), "USDT");
  console.log("Node Level:", userInfo[5]);
  console.log("");
  
  console.log("=".repeat(60));
  console.log("✅ Basic stake test completed!");
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("1. Test withdraw function");
  console.log("2. Test swap function");
  console.log("3. Test reward distribution");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  });
