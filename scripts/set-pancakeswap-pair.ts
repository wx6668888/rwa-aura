import { ethers } from "hardhat";

/**
 * 设置 PancakeSwap Pair 地址
 * 
 * 在 PancakeSwap 创建交易对后，需要设置 Pair 地址以启用交易税
 */

async function main() {
  console.log("设置 PancakeSwap Pair 地址...");
  console.log("");

  // 从环境变量读取地址
  const RWA_TOKEN_ADDRESS = process.env.RWA_TOKEN_ADDRESS;
  const PANCAKESWAP_PAIR_ADDRESS = process.env.PANCAKESWAP_PAIR_ADDRESS;

  if (!RWA_TOKEN_ADDRESS) {
    throw new Error("请在 .env 文件中设置 RWA_TOKEN_ADDRESS");
  }

  if (!PANCAKESWAP_PAIR_ADDRESS) {
    throw new Error("请在 .env 文件中设置 PANCAKESWAP_PAIR_ADDRESS");
  }

  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);
  console.log("");

  // 连接到 RWAToken 合约
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = RWAToken.attach(RWA_TOKEN_ADDRESS);

  // 设置 Pair 地址
  console.log("设置 Pair 地址:", PANCAKESWAP_PAIR_ADDRESS);
  const tx = await rwaToken.setPancakeswapPair(PANCAKESWAP_PAIR_ADDRESS);
  await tx.wait();

  console.log("✅ Pair 地址设置成功");
  console.log("交易哈希:", tx.hash);
  console.log("");

  // 验证设置
  const pairAddress = await rwaToken.pancakeswapPair();
  console.log("当前 Pair 地址:", pairAddress);
  console.log("");

  if (pairAddress.toLowerCase() === PANCAKESWAP_PAIR_ADDRESS.toLowerCase()) {
    console.log("✅ 验证成功");
  } else {
    console.log("❌ 验证失败");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
