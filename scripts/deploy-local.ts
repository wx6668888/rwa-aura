import { ethers } from "hardhat";

/**
 * 本地测试网完整部署脚本
 * 
 * 部署顺序：
 * 1. TestUSDT
 * 2. RWAToken
 * 3. StakingContract
 * 4. 配置白名单
 * 5. 分配测试代币
 */

async function main() {
  console.log("=".repeat(60));
  console.log("RWA Protocol - 本地测试网部署");
  console.log("=".repeat(60));
  console.log("");

  const [deployer, account1, account2] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");

  // 配置地址
  const TREASURY_ADDRESS = deployer.address;
  const LIQUIDITY_FUND_ADDRESS = deployer.address;
  const BACKEND_ADDRESS = deployer.address;

  console.log("配置地址:");
  console.log("  Treasury:", TREASURY_ADDRESS);
  console.log("  Liquidity Fund:", LIQUIDITY_FUND_ADDRESS);
  console.log("  Backend:", BACKEND_ADDRESS);
  console.log("");

  // 1. 部署 TestUSDT
  console.log("1. 部署 TestUSDT...");
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const testUSDT = await TestUSDT.deploy();
  await testUSDT.waitForDeployment();
  const usdtAddress = await testUSDT.getAddress();
  console.log("✅ TestUSDT 部署成功:", usdtAddress);
  console.log("");

  // 2. 部署 RWAToken
  console.log("2. 部署 RWAToken...");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const initialSupply = ethers.parseEther("1000000000"); // 10亿 RWA
  const rwaToken = await RWAToken.deploy(
    "RWA Token",
    "RWA",
    initialSupply,
    TREASURY_ADDRESS,
    LIQUIDITY_FUND_ADDRESS
  );
  await rwaToken.waitForDeployment();
  const rwaTokenAddress = await rwaToken.getAddress();
  console.log("✅ RWAToken 部署成功:", rwaTokenAddress);
  console.log("");

  // 3. 部署 StakingContract
  console.log("3. 部署 StakingContract...");
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    usdtAddress,
    rwaTokenAddress,
    TREASURY_ADDRESS,
    BACKEND_ADDRESS
  );
  await stakingContract.waitForDeployment();
  const stakingContractAddress = await stakingContract.getAddress();
  console.log("✅ StakingContract 部署成功:", stakingContractAddress);
  console.log("");

  // 4. 配置白名单
  console.log("4. 配置白名单...");
  const tx1 = await rwaToken.setWhitelist(stakingContractAddress, true);
  await tx1.wait();
  console.log("✅ StakingContract 已添加到白名单");
  console.log("");

  // 5. 分配测试代币
  console.log("5. 分配测试代币...");
  
  // 给 deployer 分配 1,000,000 USDT
  const deployerAmount = ethers.parseUnits("1000000", 6);
  await testUSDT.mint(deployer.address, deployerAmount);
  console.log("✅ Deployer 获得 1,000,000 USDT");
  
  // 给 account1 和 account2 各分配 10,000 USDT
  const accountAmount = ethers.parseUnits("10000", 6);
  await testUSDT.mint(account1.address, accountAmount);
  await testUSDT.mint(account2.address, accountAmount);
  console.log("✅ Account #1 获得 10,000 USDT");
  console.log("✅ Account #2 获得 10,000 USDT");
  console.log("");

  // 6. 验证部署
  console.log("6. 验证部署...");
  
  // 验证 TestUSDT
  const usdtName = await testUSDT.name();
  const usdtSymbol = await testUSDT.symbol();
  const usdtDecimals = await testUSDT.decimals();
  const deployerBalance = await testUSDT.balanceOf(deployer.address);
  console.log("TestUSDT 信息:");
  console.log("  名称:", usdtName);
  console.log("  符号:", usdtSymbol);
  console.log("  精度:", usdtDecimals);
  console.log("  Deployer 余额:", ethers.formatUnits(deployerBalance, 6), "USDT");
  console.log("");
  
  // 验证 RWAToken
  const tokenName = await rwaToken.name();
  const tokenSymbol = await rwaToken.symbol();
  const tokenDecimals = await rwaToken.decimals();
  const tokenTotalSupply = await rwaToken.totalSupply();
  console.log("RWAToken 信息:");
  console.log("  名称:", tokenName);
  console.log("  符号:", tokenSymbol);
  console.log("  精度:", tokenDecimals);
  console.log("  总供应量:", ethers.formatEther(tokenTotalSupply));
  console.log("");
  
  // 验证 StakingContract
  const stakingUsdtAddress = await stakingContract.usdtToken();
  const stakingRwaAddress = await stakingContract.rwaToken();
  const stakingTreasuryAddress = await stakingContract.treasuryAddress();
  const stakingBackendAddress = await stakingContract.backendAddress();
  console.log("StakingContract 信息:");
  console.log("  USDT 地址:", stakingUsdtAddress);
  console.log("  RWA 地址:", stakingRwaAddress);
  console.log("  Treasury 地址:", stakingTreasuryAddress);
  console.log("  Backend 地址:", stakingBackendAddress);
  console.log("");

  // 7. 输出部署摘要
  console.log("=".repeat(60));
  console.log("部署完成！");
  console.log("=".repeat(60));
  console.log("");
  console.log("合约地址:");
  console.log("  TestUSDT:", usdtAddress);
  console.log("  RWAToken:", rwaTokenAddress);
  console.log("  StakingContract:", stakingContractAddress);
  console.log("");
  console.log("测试账户:");
  console.log("  Deployer:", deployer.address);
  console.log("    - ETH:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("    - USDT:", ethers.formatUnits(await testUSDT.balanceOf(deployer.address), 6));
  console.log("    - RWA:", ethers.formatEther(await rwaToken.balanceOf(deployer.address)));
  console.log("");
  console.log("  Account #1:", account1.address);
  console.log("    - USDT:", ethers.formatUnits(await testUSDT.balanceOf(account1.address), 6));
  console.log("");
  console.log("  Account #2:", account2.address);
  console.log("    - USDT:", ethers.formatUnits(await testUSDT.balanceOf(account2.address), 6));
  console.log("");
  console.log("前端配置 (frontend/lib/contracts/addresses.ts):");
  console.log(`  [HARDHAT_CHAIN_ID]: {`);
  console.log(`    stakingContract: '${stakingContractAddress}',`);
  console.log(`    usdtToken: '${usdtAddress}',`);
  console.log(`    rwaToken: '${rwaTokenAddress}',`);
  console.log(`  }`);
  console.log("");
  console.log("下一步:");
  console.log("1. 更新前端合约地址配置");
  console.log("2. 在 MetaMask 中导入测试账户");
  console.log("3. 在 MetaMask 中添加代币（USDT 和 RWA）");
  console.log("4. 访问 http://localhost:3000 开始测试");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
