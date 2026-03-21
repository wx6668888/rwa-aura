import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=".repeat(60));
  console.log("🔍 BSC Testnet 配置检查");
  console.log("=".repeat(60));
  console.log("");

  // 检查环境变量
  console.log("📋 检查环境变量...");
  
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545";
  const usdtAddress = process.env.USDT_TOKEN_ADDRESS;

  let hasError = false;

  if (!privateKey) {
    console.log("❌ PRIVATE_KEY 未配置");
    hasError = true;
  } else {
    console.log("✅ PRIVATE_KEY 已配置");
  }

  if (!rpcUrl) {
    console.log("❌ BSC_TESTNET_RPC_URL 未配置");
    hasError = true;
  } else {
    console.log("✅ BSC_TESTNET_RPC_URL:", rpcUrl);
  }

  if (!usdtAddress || usdtAddress === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  USDT_TOKEN_ADDRESS 未配置，将使用默认测试网 USDT");
  } else {
    console.log("✅ USDT_TOKEN_ADDRESS:", usdtAddress);
  }

  console.log("");

  // 检查网络连接
  console.log("🌐 检查网络连接...");
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    console.log("✅ 网络连接成功");
    console.log("   Chain ID:", network.chainId.toString());
    console.log("   Network Name:", network.name);
  } catch (error: any) {
    console.log("❌ 网络连接失败:", error.message);
    hasError = true;
  }

  console.log("");

  // 检查账户余额
  if (privateKey) {
    console.log("💰 检查账户余额...");
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
      const balance = await provider.getBalance(wallet.address);
      const balanceInBNB = ethers.formatEther(balance);
      
      console.log("✅ 账户地址:", wallet.address);
      console.log("   余额:", balanceInBNB, "BNB");
      
      const balanceNum = parseFloat(balanceInBNB);
      if (balanceNum < 0.1) {
        console.log("⚠️  余额不足！需要至少 0.1 BNB");
        console.log("   请访问水龙头获取测试网 BNB:");
        console.log("   https://testnet.bnbchain.org/faucet-smart");
        hasError = true;
      } else {
        console.log("✅ 余额充足");
      }
    } catch (error: any) {
      console.log("❌ 检查余额失败:", error.message);
      hasError = true;
    }
  }

  console.log("");

  // 总结
  console.log("=".repeat(60));
  if (hasError) {
    console.log("❌ 配置检查未通过，请修复上述问题");
    console.log("");
    console.log("需要帮助？查看：切换到BSC测试网指南.md");
  } else {
    console.log("✅ 配置检查通过！可以开始部署");
    console.log("");
    console.log("下一步：运行部署脚本");
    console.log("  deploy-to-bsc-testnet.bat");
    console.log("  或");
    console.log("  npx hardhat run scripts/deploy-all.ts --network bscTestnet");
  }
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
