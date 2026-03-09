import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { CONTRACT_ADDRESSES } from "../frontend/lib/contracts/addresses";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("=".repeat(60));
  console.log("🎰 部署 Lottery Contract");
  console.log("=".repeat(60));
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB/ETH");
  console.log("网络 Chain ID:", chainId);
  console.log();

  // 获取合约地址
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`未找到 Chain ID ${chainId} 的合约地址配置`);
  }

  const RWA_TOKEN = addresses.rwaToken || process.env.RWA_TOKEN_ADDRESS || "";
  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;

  if (!RWA_TOKEN || RWA_TOKEN === "0x0000000000000000000000000000000000000000") {
    throw new Error("RWAToken 地址未配置或无效");
  }
  console.log("国库地址 (5% 份额接收):", TREASURY);

  // Chainlink VRF 配置（根据网络选择）
  let VRF_COORDINATOR: string;
  let KEY_HASH: string;
  
  if (chainId === 31337) {
    // 本地 Hardhat 网络 - 使用 Mock VRF（需要先部署 Mock）
    console.log("⚠️  本地网络：需要部署 Mock VRF Coordinator");
    VRF_COORDINATOR = "0x0000000000000000000000000000000000000000"; // 需要部署 Mock
    KEY_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
  } else if (chainId === 97) {
    // BSC Testnet
    VRF_COORDINATOR = "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f";
    KEY_HASH = "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314";
  } else if (chainId === 56) {
    // BSC Mainnet
    VRF_COORDINATOR = "0xc587d9053cd1118f25F645F9E08BB98c9cbA57F2";
    KEY_HASH = "0x17cd473250a9a479dc7f234c64332ed4bc8af9e8ded7556aa6e66d83da49f2a0";
  } else {
    throw new Error(`不支持的网络 Chain ID: ${chainId}`);
  }
  
  const SUBSCRIPTION_ID = process.env.CHAINLINK_SUBSCRIPTION_ID || "0";

  console.log("配置参数:");
  console.log("- RWA Token:", RWA_TOKEN);
  console.log("- VRF Coordinator:", VRF_COORDINATOR);
  console.log("- Key Hash:", KEY_HASH);
  console.log("- Subscription ID:", SUBSCRIPTION_ID);
  console.log();

  // 检查 LotteryContract 是否存在（优先使用简化版用于本地测试）
  let LotteryContract;
  let contractName = "LotteryContract";
  
  try {
    // 尝试使用简化版（本地测试）
    if (chainId === 31337) {
      try {
        LotteryContract = await ethers.getContractFactory("LotteryContractSimple");
        contractName = "LotteryContractSimple";
        console.log("📝 使用简化版 LotteryContractSimple（本地测试）");
      } catch {
        // 如果简化版不存在，尝试完整版
        LotteryContract = await ethers.getContractFactory("LotteryContract");
        contractName = "LotteryContract";
      }
    } else {
      // 非本地网络使用完整版
      LotteryContract = await ethers.getContractFactory("LotteryContract");
    }
    
    // 部署 Lottery Contract
    console.log(`📦 正在部署 ${contractName}...`);
    let lottery;
    
    if (contractName === "LotteryContractSimple") {
      // 简化版：RWA Token 地址 + 国库地址（接收每期 5%）
      lottery = await LotteryContract.deploy(RWA_TOKEN, TREASURY);
    } else {
      // 完整版需要 VRF 配置
      lottery = await LotteryContract.deploy(
        RWA_TOKEN,
        VRF_COORDINATOR,
        KEY_HASH,
        SUBSCRIPTION_ID
      );
    }

    await lottery.waitForDeployment();
    const lotteryAddress = await lottery.getAddress();
    console.log(`✅ ${contractName} 部署成功!`);
    console.log("   地址:", lotteryAddress);
    console.log();

    // 验证部署
    console.log("🔍 验证部署...");
    const weeklyPrice = await lottery.WEEKLY_TICKET_PRICE();
    const monthlyPrice = await lottery.MONTHLY_TICKET_PRICE();
    const weeklyRound = await lottery.weeklyRound();
    const monthlyRound = await lottery.monthlyRound();
    let realtimePrice = "0", annualPrice = "0";
    if (contractName === "LotteryContractSimple") {
      try {
        realtimePrice = ethers.formatEther(await (lottery as any).REALTIME_TICKET_PRICE());
        annualPrice = ethers.formatEther(await (lottery as any).ANNUAL_TICKET_PRICE());
      } catch {}
    }

    console.log("✅ 合约配置:");
    console.log("   周奖池票价:", ethers.formatEther(weeklyPrice), "RWA");
    console.log("   月奖池票价:", ethers.formatEther(monthlyPrice), "RWA");
    if (realtimePrice !== "0") console.log("   实时奖池票价:", realtimePrice, "RWA (每5分钟开奖)");
    if (annualPrice !== "0") console.log("   年度奖池票价:", annualPrice, "RWA");
    console.log("   当前周周期数:", weeklyRound.toString());
    console.log("   当前月周期数:", monthlyRound.toString());
    console.log();

    // 保存部署信息
    console.log("=".repeat(60));
    console.log("✅ 部署完成!");
    console.log("=".repeat(60));
    console.log();
    console.log("📋 部署信息:");
    console.log(`   LotteryContract: ${lotteryAddress}`);
    console.log(`   RWAToken: ${RWA_TOKEN}`);
    console.log(`   VRF Coordinator: ${VRF_COORDINATOR}`);
    console.log(`   Subscription ID: ${SUBSCRIPTION_ID}`);
    console.log();
    console.log("📝 下一步操作:");
    console.log("1. 更新 frontend/lib/contracts/addresses.ts:");
    console.log(`   lotteryContract: '${lotteryAddress}'`);
    console.log();
    if (chainId !== 31337) {
      console.log("2. 在 Chainlink VRF 控制台添加此合约为消费者:");
      if (chainId === 97) {
        console.log("   https://vrf.chain.link/bsc-testnet");
      } else if (chainId === 56) {
        console.log("   https://vrf.chain.link/bsc");
      }
      console.log("3. 确保订阅有足够的 LINK 代币");
      console.log("4. 验证合约:");
      console.log(`   npx hardhat verify --network ${chainId === 97 ? 'bscTestnet' : 'bsc'} ${lotteryAddress} ${RWA_TOKEN} ${VRF_COORDINATOR} ${KEY_HASH} ${SUBSCRIPTION_ID}`);
    } else {
      console.log("2. ⚠️  本地网络：需要部署 Mock VRF Coordinator 才能使用");
    }
    console.log();
  } catch (error: any) {
    if (error.message?.includes("LotteryContract") || error.message?.includes("not found")) {
      console.log("❌ LotteryContract 合约未找到");
      console.log("   可能原因：合约文件被重命名为 .bak 或编译失败");
      console.log("   解决方案：");
      console.log("   1. 检查 contracts/LotteryContract.sol 是否存在");
      console.log("   2. 如果存在 .bak 文件，需要恢复并修复编译问题");
      console.log("   3. 或者暂时跳过彩票功能部署");
      throw error;
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
