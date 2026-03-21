import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Hardhat Local 快速修复脚本
 * 
 * 自动执行:
 * 1. 部署所有合约
 * 2. 更新前端配置
 * 3. 验证部署
 */

async function main() {
  console.log("=".repeat(60));
  console.log("Hardhat Local 快速修复");
  console.log("=".repeat(60));
  console.log("");

  // 检查网络连接
  console.log("检查网络连接...");
  try {
    const network = await ethers.provider.getNetwork();
    console.log("✅ 已连接到网络 (Chain ID:", network.chainId.toString() + ")");
    console.log("");
  } catch (error) {
    console.log("❌ 无法连接到 Hardhat 节点");
    console.log("");
    console.log("请先启动 Hardhat 节点:");
    console.log("  npx hardhat node");
    console.log("");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("");

  // 配置地址
  const TREASURY_ADDRESS = deployer.address;
  const LIQUIDITY_FUND_ADDRESS = deployer.address;
  const BACKEND_ADDRESS = deployer.address;

  // 1. 部署 TestUSDT
  console.log("1/3 部署 TestUSDT...");
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const testUSDT = await TestUSDT.deploy();
  await testUSDT.waitForDeployment();
  const usdtAddress = await testUSDT.getAddress();
  console.log("✅ TestUSDT:", usdtAddress);
  console.log("");

  // 2. 部署 RWAToken
  console.log("2/3 部署 RWAToken...");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const initialSupply = ethers.parseEther("1000000000");
  const rwaToken = await RWAToken.deploy(
    "RWA Token",
    "RWA",
    initialSupply,
    TREASURY_ADDRESS,
    LIQUIDITY_FUND_ADDRESS
  );
  await rwaToken.waitForDeployment();
  const rwaTokenAddress = await rwaToken.getAddress();
  console.log("✅ RWAToken:", rwaTokenAddress);
  console.log("");

  // 3. 部署 StakingContract
  console.log("3/3 部署 StakingContract...");
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    usdtAddress,
    rwaTokenAddress,
    TREASURY_ADDRESS,
    BACKEND_ADDRESS
  );
  await stakingContract.waitForDeployment();
  const stakingContractAddress = await stakingContract.getAddress();
  console.log("✅ StakingContract:", stakingContractAddress);
  console.log("");

  // 4. 配置白名单
  console.log("配置白名单...");
  await rwaToken.setWhitelist(stakingContractAddress, true);
  console.log("✅ 白名单已配置");
  console.log("");

  // 5. 分配测试代币
  console.log("分配测试代币...");
  const deployerAmount = ethers.parseUnits("1000000", 6);
  await testUSDT.mint(deployer.address, deployerAmount);
  console.log("✅ 已分配 1,000,000 USDT 给 deployer");
  console.log("");

  // 6. 更新前端配置
  console.log("更新前端配置...");
  const addressesPath = path.join(__dirname, "../frontend/lib/contracts/addresses.ts");
  
  try {
    let content = fs.readFileSync(addressesPath, "utf-8");
    
    // 替换 Hardhat 配置中的地址
    const hardhatConfigRegex = /\[HARDHAT_CHAIN_ID\]:\s*{[^}]+}/s;
    const newHardhatConfig = `[HARDHAT_CHAIN_ID]: {
    stakingContract: '${stakingContractAddress}',
    usdtToken: '${usdtAddress}',
    rwaToken: '${rwaTokenAddress}',
    lotteryContract: '0x0000000000000000000000000000000000000000',
  }`;
    
    content = content.replace(hardhatConfigRegex, newHardhatConfig);
    
    fs.writeFileSync(addressesPath, content, "utf-8");
    console.log("✅ 前端配置已更新");
    console.log("");
  } catch (error) {
    console.log("⚠️  无法自动更新前端配置");
    console.log("   请手动更新 frontend/lib/contracts/addresses.ts");
    console.log("");
  }

  // 7. 输出摘要
  console.log("=".repeat(60));
  console.log("✅ 修复完成！");
  console.log("=".repeat(60));
  console.log("");
  console.log("合约地址:");
  console.log("  TestUSDT:", usdtAddress);
  console.log("  RWAToken:", rwaTokenAddress);
  console.log("  StakingContract:", stakingContractAddress);
  console.log("");
  console.log("下一步:");
  console.log("1. 在 MetaMask 中添加 Hardhat Local 网络");
  console.log("   - 网络名称: Hardhat Local");
  console.log("   - RPC URL: http://127.0.0.1:8545");
  console.log("   - Chain ID: 31337");
  console.log("   - 货币符号: ETH");
  console.log("");
  console.log("2. 导入测试账户私钥:");
  console.log("   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("");
  console.log("3. 启动前端:");
  console.log("   cd frontend && npm run dev");
  console.log("");
  console.log("4. 访问 http://localhost:3000");
  console.log("");
  console.log("5. 在 MetaMask 中添加代币:");
  console.log("   - USDT:", usdtAddress);
  console.log("   - RWA:", rwaTokenAddress);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
