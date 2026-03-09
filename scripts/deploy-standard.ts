import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 标准启动部署脚本（100美金预算）
 * 
 * 部署顺序：
 * 1. RWAToken
 * 2. StRWA
 * 3. TreasuryContract
 * 4. StakingContract
 * 5. SwapContract
 * 6. 初始化配置
 * 
 * 成本控制：
 * - 选择低峰时段部署（3 Gwei）
 * - 批量部署减少Gas
 * - 总成本预计：20-35 USDT
 */

interface DeploymentInfo {
  network: string;
  deployer: string;
  timestamp: string;
  gasPrice: string;
  contracts: {
    RWAToken?: string;
    StRWA?: string;
    TreasuryContract?: string;
    StakingContract?: string;
    SwapContract?: string;
  };
  cost: {
    bnb: string;
    usdt: string;
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("RWA Protocol - 标准启动部署（100美金预算）");
  console.log("=".repeat(60));
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceBNB = ethers.formatEther(balance);
  console.log("账户余额:", balanceBNB, "BNB");
  
  // 检查余额（至少需要 0.15 BNB）
  if (parseFloat(balanceBNB) < 0.15) {
    throw new Error(`余额不足！至少需要 0.15 BNB（约 45 USDT），当前余额：${balanceBNB} BNB`);
  }
  
  console.log("");

  // 获取当前 Gas 价格
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("3", "gwei"); // 默认3 Gwei（低峰时段）
  console.log("当前 Gas 价格:", ethers.formatUnits(gasPrice, "gwei"), "Gwei");
  
  // 如果Gas价格过高，提示用户
  const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, "gwei"));
  if (gasPriceGwei > 5) {
    console.log("⚠️  警告：Gas 价格较高，建议等待低峰时段（< 5 Gwei）");
    console.log("   当前价格:", gasPriceGwei, "Gwei");
    console.log("   预计成本会增加:", ((gasPriceGwei / 3) - 1) * 100, "%");
    console.log("");
  }
  
  // 配置地址（从环境变量读取）
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;
  const LIQUIDITY_FUND_ADDRESS = process.env.LIQUIDITY_FUND_ADDRESS || deployer.address;
  const BACKEND_ADDRESS = process.env.BACKEND_ADDRESS || deployer.address;
  const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS || "0x55d398326f99059fF775485246999027B3197955"; // BSC Mainnet USDT

  console.log("配置地址:");
  console.log("  Treasury:", TREASURY_ADDRESS);
  console.log("  Liquidity Fund:", LIQUIDITY_FUND_ADDRESS);
  console.log("  Backend:", BACKEND_ADDRESS);
  console.log("  USDT:", USDT_ADDRESS);
  console.log("");

  const deploymentInfo: DeploymentInfo = {
    network: "BSC Mainnet",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasPrice: ethers.formatUnits(gasPrice, "gwei"),
    contracts: {},
    cost: {
      bnb: "0",
      usdt: "0"
    }
  };

  const startBalance = balance;
  let totalGasUsed = BigInt(0);

  // ========== 阶段1：部署核心合约 ==========
  console.log("阶段1：部署核心合约");
  console.log("-".repeat(60));

  // 1. 部署 RWAToken
  console.log("1. 部署 RWAToken...");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const initialSupply = ethers.parseEther("1000000000"); // 10亿 RWA
  const rwaTokenDeploy = await RWAToken.deploy(
    "RWA Token",
    "RWA",
    initialSupply,
    TREASURY_ADDRESS,
    LIQUIDITY_FUND_ADDRESS,
    { gasPrice }
  );
  const rwaTokenDeployTx = await rwaTokenDeploy.deploymentTransaction();
  await rwaTokenDeploy.waitForDeployment();
  const rwaTokenAddress = await rwaTokenDeploy.getAddress();
  const rwaTokenReceipt = await ethers.provider.getTransactionReceipt(rwaTokenDeployTx!.hash);
  totalGasUsed += rwaTokenReceipt!.gasUsed * rwaTokenReceipt!.gasPrice;
  deploymentInfo.contracts.RWAToken = rwaTokenAddress;
  console.log("✅ RWAToken 部署成功:", rwaTokenAddress);
  console.log("   Gas Used:", rwaTokenReceipt!.gasUsed.toString());
  console.log("");

  // 2. 部署 StRWA
  console.log("2. 部署 StRWA...");
  const StRWA = await ethers.getContractFactory("StRWA");
  const stRWADeploy = await StRWA.deploy({ gasPrice });
  const stRWADeployTx = await stRWADeploy.deploymentTransaction();
  await stRWADeploy.waitForDeployment();
  const stRWAAddress = await stRWADeploy.getAddress();
  const stRWAReceipt = await ethers.provider.getTransactionReceipt(stRWADeployTx!.hash);
  totalGasUsed += stRWAReceipt!.gasUsed * stRWAReceipt!.gasPrice;
  deploymentInfo.contracts.StRWA = stRWAAddress;
  console.log("✅ StRWA 部署成功:", stRWAAddress);
  console.log("   Gas Used:", stRWAReceipt!.gasUsed.toString());
  console.log("");

  // 3. 部署 TreasuryContract
  console.log("3. 部署 TreasuryContract...");
  const TreasuryContract = await ethers.getContractFactory("TreasuryContract");
  const treasuryDeploy = await TreasuryContract.deploy(USDT_ADDRESS, { gasPrice });
  const treasuryDeployTx = await treasuryDeploy.deploymentTransaction();
  await treasuryDeploy.waitForDeployment();
  const treasuryAddress = await treasuryDeploy.getAddress();
  const treasuryReceipt = await ethers.provider.getTransactionReceipt(treasuryDeployTx!.hash);
  totalGasUsed += treasuryReceipt!.gasUsed * treasuryReceipt!.gasPrice;
  deploymentInfo.contracts.TreasuryContract = treasuryAddress;
  console.log("✅ TreasuryContract 部署成功:", treasuryAddress);
  console.log("   Gas Used:", treasuryReceipt!.gasUsed.toString());
  console.log("");

  // 4. 部署 StakingContract
  console.log("4. 部署 StakingContract...");
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingDeploy = await StakingContract.deploy(
    USDT_ADDRESS,
    rwaTokenAddress,
    treasuryAddress,
    BACKEND_ADDRESS,
    { gasPrice }
  );
  const stakingDeployTx = await stakingDeploy.deploymentTransaction();
  await stakingDeploy.waitForDeployment();
  const stakingContractAddress = await stakingDeploy.getAddress();
  const stakingReceipt = await ethers.provider.getTransactionReceipt(stakingDeployTx!.hash);
  totalGasUsed += stakingReceipt!.gasUsed * stakingReceipt!.gasPrice;
  deploymentInfo.contracts.StakingContract = stakingContractAddress;
  console.log("✅ StakingContract 部署成功:", stakingContractAddress);
  console.log("   Gas Used:", stakingReceipt!.gasUsed.toString());
  console.log("");

  // 5. 部署 SwapContract
  console.log("5. 部署 SwapContract...");
  const SwapContract = await ethers.getContractFactory("SwapContract");
  const swapDeploy = await SwapContract.deploy(rwaTokenAddress, stRWAAddress, { gasPrice });
  const swapDeployTx = await swapDeploy.deploymentTransaction();
  await swapDeploy.waitForDeployment();
  const swapContractAddress = await swapDeploy.getAddress();
  const swapReceipt = await ethers.provider.getTransactionReceipt(swapDeployTx!.hash);
  totalGasUsed += swapReceipt!.gasUsed * swapReceipt!.gasPrice;
  deploymentInfo.contracts.SwapContract = swapContractAddress;
  console.log("✅ SwapContract 部署成功:", swapContractAddress);
  console.log("   Gas Used:", swapReceipt!.gasUsed.toString());
  console.log("");

  // ========== 阶段2：初始化配置 ==========
  console.log("阶段2：初始化配置");
  console.log("-".repeat(60));

  // 1. 设置 StRWA 的 StakingContract 地址
  console.log("1. 配置 StRWA...");
  const setStakingTx = await stRWADeploy.setStakingContract(stakingContractAddress, { gasPrice });
  const setStakingReceipt = await setStakingTx.wait();
  totalGasUsed += setStakingReceipt!.gasUsed * setStakingReceipt!.gasPrice;
  console.log("✅ StRWA 配置完成");
  console.log("");

  // 2. 设置 TreasuryContract 的 StakingContract 地址
  console.log("2. 配置 TreasuryContract...");
  const setTreasuryStakingTx = await treasuryDeploy.setStakingContract(stakingContractAddress, { gasPrice });
  const setTreasuryStakingReceipt = await setTreasuryStakingTx.wait();
  totalGasUsed += setTreasuryStakingReceipt!.gasUsed * setTreasuryStakingReceipt!.gasPrice;
  console.log("✅ TreasuryContract 配置完成");
  console.log("");

  // 3. 设置 RWAToken 的 StakingContract 地址（如果合约支持）
  try {
    console.log("3. 配置 RWAToken...");
    const setRWAStakingTx = await rwaTokenDeploy.setStakingContract(stakingContractAddress, { gasPrice });
    const setRWAStakingReceipt = await setRWAStakingTx.wait();
    totalGasUsed += setRWAStakingReceipt!.gasUsed * setRWAStakingReceipt!.gasPrice;
    console.log("✅ RWAToken 配置完成");
  } catch (error) {
    console.log("⚠️  RWAToken 可能不支持 setStakingContract，跳过");
  }
  console.log("");

  // 4. 设置 PancakeSwap Pair（如果已创建）
  const PANCAKESWAP_PAIR = process.env.PANCAKESWAP_PAIR || "";
  if (PANCAKESWAP_PAIR) {
    console.log("4. 设置 PancakeSwap Pair...");
    const setPairTx = await rwaTokenDeploy.setPancakeSwapPair(PANCAKESWAP_PAIR, { gasPrice });
    const setPairReceipt = await setPairTx.wait();
    totalGasUsed += setPairReceipt!.gasUsed * setPairReceipt!.gasPrice;
    console.log("✅ PancakeSwap Pair 配置完成");
    console.log("");
  } else {
    console.log("4. 跳过 PancakeSwap Pair 设置（未配置）");
    console.log("");
  }

  // 5. 设置白名单
  console.log("5. 设置白名单...");
  const whitelistAddresses = [
    stakingContractAddress,
    treasuryAddress,
    swapContractAddress,
    BACKEND_ADDRESS
  ];
  
  for (const addr of whitelistAddresses) {
    const whitelistTx = await rwaTokenDeploy.setWhitelist(addr, true, { gasPrice });
    const whitelistReceipt = await whitelistTx.wait();
    totalGasUsed += whitelistReceipt!.gasUsed * whitelistReceipt!.gasPrice;
  }
  console.log("✅ 白名单配置完成（", whitelistAddresses.length, "个地址）");
  console.log("");

  // 6. 初始化 SwapContract 池子（可选，需要提供初始流动性）
  const INITIAL_LIQUIDITY = process.env.INITIAL_LIQUIDITY || "0";
  if (INITIAL_LIQUIDITY !== "0") {
    console.log("6. 初始化 SwapContract 池子...");
    const rwaAmount = ethers.parseEther(INITIAL_LIQUIDITY);
    const stRwaAmount = ethers.parseEther(INITIAL_LIQUIDITY);
    
    // 授权
    const approveRwaTx = await rwaTokenDeploy.approve(swapContractAddress, rwaAmount, { gasPrice });
    await approveRwaTx.wait();
    const approveStRwaTx = await stRWADeploy.approve(swapContractAddress, stRwaAmount, { gasPrice });
    await approveStRwaTx.wait();
    
    // 初始化
    const initPoolTx = await swapDeploy.initializePool(rwaAmount, stRwaAmount, { gasPrice });
    const initPoolReceipt = await initPoolTx.wait();
    totalGasUsed += initPoolReceipt!.gasUsed * initPoolReceipt!.gasPrice;
    console.log("✅ SwapContract 池子初始化完成");
    console.log("");
  } else {
    console.log("6. 跳过 SwapContract 池子初始化（未配置初始流动性）");
    console.log("");
  }

  // ========== 阶段3：计算成本 ==========
  const endBalance = await ethers.provider.getBalance(deployer.address);
  const usedBalance = startBalance - endBalance;
  const usedBalanceBNB = ethers.formatEther(usedBalance);
  
  // 假设 BNB 价格 300 USDT
  const BNB_PRICE = 300;
  const usedBalanceUSDT = parseFloat(usedBalanceBNB) * BNB_PRICE;
  
  deploymentInfo.cost.bnb = usedBalanceBNB;
  deploymentInfo.cost.usdt = usedBalanceUSDT.toFixed(2);

  console.log("阶段3：部署成本统计");
  console.log("-".repeat(60));
  console.log("总 Gas 使用:", totalGasUsed.toString());
  console.log("使用 BNB:", usedBalanceBNB);
  console.log("使用 USDT:", usedBalanceUSDT.toFixed(2), "USDT（假设BNB价格", BNB_PRICE, "USDT）");
  console.log("剩余 BNB:", ethers.formatEther(endBalance));
  console.log("");

  // 成本检查
  if (usedBalanceUSDT > 100) {
    console.log("⚠️  警告：部署成本超过 100 USDT！");
    console.log("   实际成本:", usedBalanceUSDT.toFixed(2), "USDT");
    console.log("   建议：等待低峰时段重新部署");
  } else {
    console.log("✅ 部署成本在预算内（100 USDT）");
    console.log("   实际成本:", usedBalanceUSDT.toFixed(2), "USDT");
    console.log("   剩余预算:", (100 - usedBalanceUSDT).toFixed(2), "USDT");
  }
  console.log("");

  // ========== 阶段4：验证部署 ==========
  console.log("阶段4：验证部署");
  console.log("-".repeat(60));

  console.log("合约地址汇总:");
  console.log("  RWAToken:", rwaTokenAddress);
  console.log("  StRWA:", stRWAAddress);
  console.log("  TreasuryContract:", treasuryAddress);
  console.log("  StakingContract:", stakingContractAddress);
  console.log("  SwapContract:", swapContractAddress);
  console.log("");

  // 验证合约功能
  try {
    const tokenName = await rwaTokenDeploy.name();
    const tokenSymbol = await rwaTokenDeploy.symbol();
    console.log("RWAToken 验证:");
    console.log("  名称:", tokenName);
    console.log("  符号:", tokenSymbol);
    console.log("");

    const stakingUsdt = await stakingDeploy.usdtToken();
    const stakingRwa = await stakingDeploy.rwaToken();
    console.log("StakingContract 验证:");
    console.log("  USDT 地址:", stakingUsdt);
    console.log("  RWA 地址:", stakingRwa);
    console.log("  Treasury 地址:", await stakingDeploy.treasuryAddress());
    console.log("  Backend 地址:", await stakingDeploy.backendAddress());
    console.log("");
  } catch (error) {
    console.log("⚠️  验证过程中出现错误:", error);
  }

  // ========== 阶段5：保存部署信息 ==========
  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentDir, `deployment-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("✅ 部署信息已保存到:", deploymentFile);
  console.log("");

  // ========== 阶段6：输出后续步骤 ==========
  console.log("=".repeat(60));
  console.log("✅ 标准启动部署完成！");
  console.log("=".repeat(60));
  console.log("");
  console.log("部署成本:", usedBalanceUSDT.toFixed(2), "USDT");
  console.log("剩余预算:", (100 - usedBalanceUSDT).toFixed(2), "USDT");
  console.log("");
  console.log("下一步操作:");
  console.log("1. 验证合约（可选，免费）:");
  console.log("   npx hardhat verify --network bscMainnet", rwaTokenAddress, '"RWA Token" "RWA"', ethers.formatEther(initialSupply), TREASURY_ADDRESS, LIQUIDITY_FUND_ADDRESS);
  console.log("");
  console.log("2. 在 PancakeSwap 创建 RWA/USDT 交易对");
  console.log("3. 添加初始流动性");
  console.log("4. 设置 PancakeSwap Pair 地址");
  console.log("5. 启动后端服务");
  console.log("");
  console.log("环境变量配置:");
  console.log(`RWA_TOKEN_ADDRESS=${rwaTokenAddress}`);
  console.log(`STAKING_CONTRACT_ADDRESS=${stakingContractAddress}`);
  console.log(`ST_RWA_ADDRESS=${stRWAAddress}`);
  console.log(`TREASURY_CONTRACT_ADDRESS=${treasuryAddress}`);
  console.log(`SWAP_CONTRACT_ADDRESS=${swapContractAddress}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });
