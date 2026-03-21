import { ethers } from "hardhat";

async function main() {
  console.log("开始部署 USDTRWASwap 合约...");

  // 获取合约地址 (BSC Testnet)
  const USDT_ADDRESS = "0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2";
  const RWA_ADDRESS = "0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6";

  // 部署合约
  const USDTRWASwap = await ethers.getContractFactory("USDTRWASwap");
  const swap = await USDTRWASwap.deploy(USDT_ADDRESS, RWA_ADDRESS);

  await swap.waitForDeployment();
  const swapAddress = await swap.getAddress();

  console.log("✅ USDTRWASwap 部署成功！");
  console.log("合约地址:", swapAddress);
  console.log("\n配置信息:");
  console.log("- USDT地址:", USDT_ADDRESS);
  console.log("- RWA地址:", RWA_ADDRESS);
  console.log("- 价格: 1 RWA = 0.85 USDT");
  console.log("- 最小交易: 10 USDT");
  console.log("- 最大交易: 100,000 USDT");

  console.log("\n下一步:");
  console.log("1. 添加流动性: swap.addLiquidity(usdtAmount, rwaAmount)");
  console.log("2. 更新前端配置: CONTRACT_ADDRESSES 添加 usdtRwaSwap");
  console.log("3. 验证合约: npx hardhat verify --network bscTestnet", swapAddress, USDT_ADDRESS, RWA_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
