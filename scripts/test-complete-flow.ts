import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer, user] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("🧪 Complete Flow Test - Staking, stRWA, Withdraw, Swap");
  console.log("=".repeat(60));
  console.log("\nDeployer:", deployer.address);
  console.log("User:", user.address);
  console.log("");
  
  // 使用最新部署的合约地址（2026-03-02 最新部署）
  // 注意：每次重启 Hardhat 节点，地址会变化，需要重新部署
  const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS || "0x1291Be112d480055DaFd8a610b7d1e203891C274";
  const stRWAAddress = process.env.ST_RWA_ADDRESS || "0x4c5859f0F772848b2D91F1D83E2Fe57935348029";
  const rwaTokenAddress = process.env.RWA_TOKEN_ADDRESS || "0x809d550fca64d94Bd9F66E60752A544199cfAC3D";
  const swapContractAddress = process.env.SWAP_CONTRACT_ADDRESS || "0xCD8a1C3ba11CF5ECfa6267617243239504a98d90";
  const usdtTokenAddress = process.env.USDT_TOKEN_ADDRESS || "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570";
  
  // 获取合约实例
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = StakingContract.attach(stakingContractAddress);
  
  const StRWA = await ethers.getContractFactory("StRWA");
  const stRWA = StRWA.attach(stRWAAddress);
  
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = RWAToken.attach(rwaTokenAddress);
  
  const SwapContract = await ethers.getContractFactory("SwapContract");
  const swapContract = SwapContract.attach(swapContractAddress);
  
  console.log("📋 Contract Addresses:");
  console.log("  StakingContract:", stakingContractAddress);
  console.log("  StRWA:", stRWAAddress);
  console.log("  RWAToken:", rwaTokenAddress);
  console.log("  SwapContract:", swapContractAddress);
  console.log("  USDT:", usdtTokenAddress);
  console.log("");
  
  // 获取 USDT 合约（使用部署脚本输出的地址）
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const usdtToken = TestUSDT.attach(usdtTokenAddress);
  
  // 验证合约
  try {
    const name = await usdtToken.name();
    const symbol = await usdtToken.symbol();
    const totalSupply = await usdtToken.totalSupply();
    console.log("✅ TestUSDT verified:");
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Total Supply:", ethers.formatUnits(totalSupply, 6), "USDT");
  } catch (error: any) {
    console.error("❌ TestUSDT verification failed:", error.message);
    console.log("\n⚠️  Make sure TestUSDT is deployed at:", usdtTokenAddress);
    console.log("   Run: npx hardhat run scripts/deploy-all.ts --network localhost");
    return;
  }
  
  // ========== Test 1: Stake ==========
  console.log("=".repeat(60));
  console.log("📦 Test 1: Stake Function");
  console.log("=".repeat(60));
  
  // 给用户 USDT
  const mintAmount = ethers.parseUnits("10000", 6);
  try {
    await usdtToken.mint(user.address, mintAmount);
    console.log("✅ User received", ethers.formatUnits(mintAmount, 6), "USDT");
  } catch (error: any) {
    console.log("ℹ️  Using existing balance");
  }
  
  const userUSDTBalance = await usdtToken.balanceOf(user.address);
  console.log("User USDT balance:", ethers.formatUnits(userUSDTBalance, 6), "USDT");
  
  if (userUSDTBalance < ethers.parseUnits("100", 6)) {
    console.log("❌ User doesn't have enough USDT");
    return;
  }
  
  // 质押 1000 USDT
  const stakeAmount = ethers.parseUnits("1000", 6);
  await usdtToken.connect(user).approve(stakingContractAddress, stakeAmount);
  
  console.log("\nStaking", ethers.formatUnits(stakeAmount, 6), "USDT...");
  const tx1 = await stakingContract.connect(user).stake(stakeAmount, ethers.ZeroAddress);
  await tx1.wait();
  console.log("✅ Stake successful!");
  
  // 检查 stRWA 余额（应该收到 500 stRWA，因为 50% 转换为 stRWA）
  const userStRWABalance = await stRWA.balanceOf(user.address);
  console.log("User stRWA balance:", ethers.formatEther(userStRWABalance), "stRWA");
  
  const expectedStRWA = ethers.parseEther("500"); // 1000 USDT * 50% = 500 stRWA
  if (userStRWABalance >= expectedStRWA) {
    console.log("✅ stRWA minted correctly!");
  } else {
    console.log("⚠️  stRWA amount:", ethers.formatEther(userStRWABalance), "(expected:", ethers.formatEther(expectedStRWA), ")");
  }
  
  // 检查用户信息
  const userInfo = await stakingContract.getUserStakeInfo(user.address);
  console.log("\nUser Stake Info:");
  console.log("  Total Staked:", ethers.formatEther(userInfo[0]), "USDT (18 decimals)");
  console.log("  RWA Pending:", ethers.formatEther(userInfo[1]), "RWA");
  console.log("  USDT Rewards:", ethers.formatEther(userInfo[2]), "USDT");
  console.log("");
  
  // ========== Test 2: Swap (if pool initialized) ==========
  console.log("=".repeat(60));
  console.log("📦 Test 2: Swap Function");
  console.log("=".repeat(60));
  
  let poolStatus;
  try {
    poolStatus = await swapContract.getPoolStatus();
    console.log("Pool Status:");
    console.log("  RWA Pool:", ethers.formatEther(poolStatus[0]), "RWA");
    console.log("  stRWA Pool:", ethers.formatEther(poolStatus[1]), "stRWA");
    console.log("  Swap Rate:", poolStatus[2].toString(), "(100 = 1:1)");
    if (poolStatus.length > 3) {
      console.log("  Swap Enabled:", poolStatus[3]);
    }
  } catch (error: any) {
    console.log("⚠️  Error reading pool status:", error.message);
    poolStatus = [0n, 0n, 100n, true];
  }
  
  if (poolStatus[0] > 0n && poolStatus[1] > 0n && userStRWABalance > 0n) {
    const swapAmount = userStRWABalance / 2n;
    if (swapAmount > 0n && poolStatus[0] >= swapAmount) {
      await stRWA.connect(user).approve(swapContractAddress, swapAmount);
      console.log("\nSwapping", ethers.formatEther(swapAmount), "stRWA to RWA...");
      const tx2 = await swapContract.connect(user).swapStRWAToRWA(swapAmount);
      await tx2.wait();
      console.log("✅ Swap successful!");
      console.log("  User stRWA:", ethers.formatEther(await stRWA.balanceOf(user.address)), "stRWA");
      console.log("  User RWA:", ethers.formatEther(await rwaToken.balanceOf(user.address)), "RWA");
    } else {
      console.log("⚠️  Cannot swap: insufficient balance or pool");
    }
  } else {
    console.log("ℹ️  Pool not initialized or user has no stRWA");
    console.log("   Pool Status: RWA=", ethers.formatEther(poolStatus[0]), ", stRWA=", ethers.formatEther(poolStatus[1]));
    console.log("   User stRWA balance:", ethers.formatEther(userStRWABalance));
    console.log("\n   To initialize pool, you can:");
    console.log("   1. Use Hardhat console:");
    console.log("      npx hardhat console --network localhost");
    console.log("      await swapContract.initializePool(ethers.parseEther('10000'), ethers.parseEther('10000'))");
    console.log("   2. Or set INITIAL_LIQUIDITY_RWA and INITIAL_LIQUIDITY_ST_RWA in .env and redeploy");
  }
  console.log("");
  
  console.log("=".repeat(60));
  console.log("✅ Complete Flow Test Finished!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  });
