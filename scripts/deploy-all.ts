import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("🚀 RWA Protocol - Complete Deployment Script");
  console.log("=".repeat(60));
  console.log("\nDeploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  console.log("\n");
  
  // ========== Step 0: Deploy TestUSDT (if needed for localhost) ==========
  const network = await ethers.provider.getNetwork();
  let usdtTokenAddress = process.env.USDT_TOKEN_ADDRESS;
  let testUSDTDeployed = false;
  
  // 对于本地网络，总是部署新的 TestUSDT 以确保可用
  if (network.chainId === 31337n) {
    console.log("📦 Step 0: Deploying TestUSDT (for localhost)...");
    const TestUSDT = await ethers.getContractFactory("TestUSDT");
    const testUSDT = await TestUSDT.deploy();
    await testUSDT.waitForDeployment();
    usdtTokenAddress = await testUSDT.getAddress();
    testUSDTDeployed = true;
    console.log("✅ TestUSDT deployed to:", usdtTokenAddress);
    console.log("");
  } else {
    // 对于非本地网络，检查 USDT 地址
    if (!usdtTokenAddress || usdtTokenAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("USDT_TOKEN_ADDRESS must be provided for non-localhost networks");
    }
  }
  
  // ========== Step 1: Deploy RWAToken ==========
  console.log("📦 Step 1: Deploying RWAToken...");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = await RWAToken.deploy(
    "RWA Token",
    "RWA",
    ethers.parseEther("1000000000"), // 10亿
    process.env.TREASURY_ADDRESS || deployer.address,
    process.env.LIQUIDITY_FUND_ADDRESS || deployer.address
  );
  await rwaToken.waitForDeployment();
  const rwaTokenAddress = await rwaToken.getAddress();
  console.log("✅ RWAToken deployed to:", rwaTokenAddress);
  console.log("");
  
  // ========== Step 2: Deploy StRWA ==========
  console.log("📦 Step 2: Deploying StRWA...");
  const StRWA = await ethers.getContractFactory("StRWA");
  const stRWA = await StRWA.deploy();
  await stRWA.waitForDeployment();
  const stRWAAddress = await stRWA.getAddress();
  console.log("✅ StRWA deployed to:", stRWAAddress);
  console.log("");
  
  // ========== Step 3: Deploy StakingContract ==========
  console.log("📦 Step 3: Deploying StakingContract...");
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    usdtTokenAddress!,
    rwaTokenAddress,
    process.env.TREASURY_ADDRESS || deployer.address,
    process.env.BACKEND_ADDRESS || deployer.address
  );
  await stakingContract.waitForDeployment();
  const stakingContractAddress = await stakingContract.getAddress();
  console.log("✅ StakingContract deployed to:", stakingContractAddress);
  console.log("");
  
  // ========== Step 4: Configure StRWA and StakingContract ==========
  console.log("⚙️  Step 4: Configuring contract relationships...");
  
  // Set StRWA's stakingContract
  console.log("   - Setting StRWA stakingContract...");
  await stRWA.setStakingContract(stakingContractAddress);
  console.log("   ✅ StRWA stakingContract set");
  
  // Set StakingContract's stRWA token
  console.log("   - Setting StakingContract stRWA token...");
  await stakingContract.setStRWAToken(stRWAAddress);
  console.log("   ✅ StakingContract stRWA token set");
  console.log("");
  
  // ========== Step 5: Deploy SwapContract ==========
  console.log("📦 Step 5: Deploying SwapContract...");
  const SwapContract = await ethers.getContractFactory("SwapContract");
  const swapContract = await SwapContract.deploy(
    rwaTokenAddress,
    stRWAAddress
  );
  await swapContract.waitForDeployment();
  const swapContractAddress = await swapContract.getAddress();
  console.log("✅ SwapContract deployed to:", swapContractAddress);
  console.log("");
  
  // ========== Step 6: Initialize SwapContract Pool (Optional) ==========
  if (process.env.INITIAL_LIQUIDITY_RWA && process.env.INITIAL_LIQUIDITY_ST_RWA) {
    console.log("⚙️  Step 6: Initializing SwapContract pool...");
    const rwaAmount = ethers.parseEther(process.env.INITIAL_LIQUIDITY_RWA);
    const stRwaAmount = ethers.parseEther(process.env.INITIAL_LIQUIDITY_ST_RWA);
    
    // Approve tokens
    await rwaToken.approve(swapContractAddress, rwaAmount);
    
    // For pool initialization, we need stRWA tokens
    // Since stRWA can only be minted by stakingContract, we temporarily
    // set deployer as stakingContract, mint, then restore
    console.log("   - Temporarily setting deployer as stakingContract for minting...");
    await stRWA.setStakingContract(deployer.address);
    await stRWA.mint(deployer.address, stRwaAmount);
    await stRWA.setStakingContract(stakingContractAddress);
    console.log("   ✅ StRWA minted and stakingContract restored");
    await stRWA.approve(swapContractAddress, stRwaAmount);
    
    // Initialize pool
    await swapContract.initializePool(rwaAmount, stRwaAmount);
    console.log("✅ SwapContract pool initialized");
    console.log("   - RWA Pool:", ethers.formatEther(rwaAmount));
    console.log("   - stRWA Pool:", ethers.formatEther(stRwaAmount));
    console.log("");
  } else {
    console.log("ℹ️  Step 6: Skipping pool initialization (set INITIAL_LIQUIDITY_RWA and INITIAL_LIQUIDITY_ST_RWA in .env)");
    console.log("");
  }
  
  // ========== Deployment Summary ==========
  console.log("=".repeat(60));
  console.log("✅ Deployment Summary");
  console.log("=".repeat(60));
  console.log("RWAToken:", rwaTokenAddress);
  console.log("StRWA:", stRWAAddress);
  console.log("StakingContract:", stakingContractAddress);
  console.log("SwapContract:", swapContractAddress);
  console.log("");
  
  // ========== Next Steps ==========
  console.log("=".repeat(60));
  console.log("📋 Next Steps");
  console.log("=".repeat(60));
  console.log("1. Update .env file with contract addresses:");
  console.log(`   RWA_TOKEN_ADDRESS=${rwaTokenAddress}`);
  console.log(`   ST_RWA_ADDRESS=${stRWAAddress}`);
  console.log(`   STAKING_CONTRACT_ADDRESS=${stakingContractAddress}`);
  console.log(`   SWAP_CONTRACT_ADDRESS=${swapContractAddress}`);
  if (usdtTokenAddress) {
    console.log(`   USDT_TOKEN_ADDRESS=${usdtTokenAddress}`);
  }
  console.log("");
  console.log("2. Update frontend contract addresses in:");
  console.log("   frontend/lib/contracts/addresses.ts");
  console.log("");
  console.log("3. Test on testnet:");
  console.log("   npx hardhat run scripts/deploy-all.ts --network bscTestnet");
  console.log("");
  console.log("4. Verify contracts on BSCScan (if on testnet/mainnet)");
  console.log("");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
