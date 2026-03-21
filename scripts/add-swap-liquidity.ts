import { ethers } from "hardhat";

async function main() {
  console.log("开始添加流动性...");

  const SWAP_ADDRESS = "0xCe26c007dce0182e537FE4F492adDc7e8715017a";
  const USDT_ADDRESS = "0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2";
  const RWA_ADDRESS = "0xb2dFB4e2BA97c45c9664f20AB6Df768A9468CdD6";

  // 获取合约实例
  const swap = await ethers.getContractAt("USDTRWASwap", SWAP_ADDRESS);
  const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);
  const rwa = await ethers.getContractAt("IERC20", RWA_ADDRESS);

  // 添加流动性数量
  const usdtAmount = ethers.parseUnits("10000", 6); // 10,000 USDT
  const rwaAmount = ethers.parseUnits("10000", 18); // 10,000 RWA

  console.log("\n流动性数量:");
  console.log("- USDT:", ethers.formatUnits(usdtAmount, 6));
  console.log("- RWA:", ethers.formatUnits(rwaAmount, 18));

  // 授权
  console.log("\n1. 授权 USDT...");
  const approveTx1 = await usdt.approve(SWAP_ADDRESS, usdtAmount);
  await approveTx1.wait();
  console.log("✅ USDT 授权完成");

  console.log("\n2. 授权 RWA...");
  const approveTx2 = await rwa.approve(SWAP_ADDRESS, rwaAmount);
  await approveTx2.wait();
  console.log("✅ RWA 授权完成");

  // 添加流动性
  console.log("\n3. 添加流动性...");
  const addLiquidityTx = await swap.addLiquidity(usdtAmount, rwaAmount);
  await addLiquidityTx.wait();
  console.log("✅ 流动性添加完成");

  // 查询流动性
  const [usdtBalance, rwaBalance] = await swap.getLiquidity();
  console.log("\n当前流动性:");
  console.log("- USDT:", ethers.formatUnits(usdtBalance, 6));
  console.log("- RWA:", ethers.formatUnits(rwaBalance, 18));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
