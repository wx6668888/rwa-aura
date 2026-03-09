import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { CONTRACT_ADDRESSES } from "../frontend/lib/contracts/addresses";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("=".repeat(60));
  console.log("💧 补充 SwapContract 流动性");
  console.log("=".repeat(60));
  console.log("\n部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB/ETH");
  console.log("网络 Chain ID:", chainId);
  console.log("");

  // 获取合约地址
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`未找到 Chain ID ${chainId} 的合约地址配置`);
  }

  const swapContractAddress = addresses.swapContract;
  const rwaTokenAddress = addresses.rwaToken;
  const stRWAAddress = addresses.stRWA;

  if (!swapContractAddress || swapContractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("SwapContract 地址未配置或无效");
  }

  if (!rwaTokenAddress || rwaTokenAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("RWAToken 地址未配置或无效");
  }

  console.log("📋 合约地址:");
  console.log("   SwapContract:", swapContractAddress);
  console.log("   RWAToken:", rwaTokenAddress);
  console.log("   StRWA:", stRWAAddress);
  console.log("");

  // 获取合约实例
  const SwapContract = await ethers.getContractFactory("SwapContract");
  const swapContract = SwapContract.attach(swapContractAddress);

  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = RWAToken.attach(rwaTokenAddress);

  // 检查当前池子状态
  console.log("📊 检查当前池子状态...");
  const poolStatus = await swapContract.getPoolStatus();
  const currentRwaBalance = ethers.formatEther(poolStatus[0]);
  const currentStRwaBalance = ethers.formatEther(poolStatus[1]);
  console.log("   当前 RWA 池子余额:", currentRwaBalance, "RWA");
  console.log("   当前 stRWA 池子余额:", currentStRwaBalance, "stRWA");
  console.log("");

  // 检查部署者 RWA 余额
  const deployerRwaBalance = await rwaToken.balanceOf(deployer.address);
  const deployerRwaBalanceFormatted = ethers.formatEther(deployerRwaBalance);
  console.log("💰 部署者 RWA 余额:", deployerRwaBalanceFormatted, "RWA");
  console.log("");

  // 确定要添加的流动性数量
  let rwaAmount: bigint;
  let stRwaAmount: bigint = 0n; // stRWA 通常不需要补充，因为用户解锁时会增加

  // 从环境变量或使用默认值
  const liquidityRWA = process.env.ADD_LIQUIDITY_RWA || "10000"; // 默认 10,000 RWA
  rwaAmount = ethers.parseEther(liquidityRWA);

  console.log("💧 准备添加流动性:");
  console.log("   RWA 数量:", ethers.formatEther(rwaAmount), "RWA");
  console.log("   stRWA 数量:", ethers.formatEther(stRwaAmount), "stRWA (可选)");
  console.log("");

  // 检查余额是否足够
  if (deployerRwaBalance < rwaAmount) {
    throw new Error(
      `RWA 余额不足！需要 ${ethers.formatEther(rwaAmount)} RWA，但只有 ${deployerRwaBalanceFormatted} RWA`
    );
  }

  // 授权 RWA 给 SwapContract
  console.log("🔐 Step 1: 授权 RWA 给 SwapContract...");
  const currentAllowance = await rwaToken.allowance(deployer.address, swapContractAddress);
  if (currentAllowance < rwaAmount) {
    console.log("   当前授权额度不足，正在授权...");
    const approveTx = await rwaToken.approve(swapContractAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log("   ✅ RWA 授权成功");
  } else {
    console.log("   ✅ 授权额度充足");
  }
  console.log("");

  // 如果是首次初始化（池子余额为 0），使用 initializePool
  if (poolStatus[0] === 0n && poolStatus[1] === 0n) {
    console.log("🔧 Step 2: 初始化 SwapContract 池子（首次）...");
    
    // 对于首次初始化，需要 stRWA
    // 由于 stRWA 只能由 stakingContract 铸造，我们需要临时设置
    const StRWA = await ethers.getContractFactory("StRWA");
    const stRWA = StRWA.attach(stRWAAddress);
    
    const stakingContractAddress = addresses.stakingContract;
    if (!stakingContractAddress) {
      throw new Error("StakingContract 地址未配置");
    }

    // 临时设置 deployer 为 stakingContract 以铸造 stRWA
    console.log("   临时设置 deployer 为 stakingContract 以铸造 stRWA...");
    const currentStakingContract = await stRWA.stakingContract();
    await stRWA.setStakingContract(deployer.address);
    
    // 铸造等量的 stRWA
    stRwaAmount = rwaAmount;
    await stRWA.mint(deployer.address, stRwaAmount);
    console.log("   ✅ 已铸造", ethers.formatEther(stRwaAmount), "stRWA");
    
    // 恢复 stakingContract
    await stRWA.setStakingContract(stakingContractAddress);
    console.log("   ✅ 已恢复 stakingContract");
    
    // 授权 stRWA
    await stRWA.approve(swapContractAddress, stRwaAmount);
    console.log("   ✅ stRWA 授权成功");
    
    // 初始化池子
    const initTx = await swapContract.initializePool(rwaAmount, stRwaAmount);
    console.log("   ⏳ 等待交易确认...");
    await initTx.wait();
    console.log("   ✅ 池子初始化成功！");
    console.log("   交易哈希:", initTx.hash);
  } else {
    // 如果池子已初始化，使用 addLiquidity 补充
    console.log("🔧 Step 2: 补充 SwapContract 流动性...");
    const addTx = await swapContract.addLiquidity(rwaAmount, stRwaAmount);
    console.log("   ⏳ 等待交易确认...");
    await addTx.wait();
    console.log("   ✅ 流动性补充成功！");
    console.log("   交易哈希:", addTx.hash);
  }
  console.log("");

  // 验证更新后的池子状态
  console.log("📊 验证更新后的池子状态...");
  const newPoolStatus = await swapContract.getPoolStatus();
  const newRwaBalance = ethers.formatEther(newPoolStatus[0]);
  const newStRwaBalance = ethers.formatEther(newPoolStatus[1]);
  console.log("   更新后 RWA 池子余额:", newRwaBalance, "RWA");
  console.log("   更新后 stRWA 池子余额:", newStRwaBalance, "stRWA");
  console.log("");

  console.log("=".repeat(60));
  console.log("✅ 流动性补充完成！");
  console.log("=".repeat(60));
  console.log("");
  console.log("📋 摘要:");
  console.log("   添加的 RWA:", ethers.formatEther(rwaAmount), "RWA");
  if (stRwaAmount > 0n) {
    console.log("   添加的 stRWA:", ethers.formatEther(stRwaAmount), "stRWA");
  }
  console.log("   当前池子 RWA 余额:", newRwaBalance, "RWA");
  console.log("   当前池子 stRWA 余额:", newStRwaBalance, "stRWA");
  console.log("");
  console.log("💡 提示:");
  console.log("   现在用户可以解锁 stRWA 了！");
  console.log("   最大可解锁数量:", newRwaBalance, "stRWA");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 操作失败:");
    console.error(error);
    process.exit(1);
  });
