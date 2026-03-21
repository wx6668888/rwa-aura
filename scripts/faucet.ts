import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 本地测试水龙头：给指定地址打 USDT + RWA，方便用小狐狸测试
 *
 * 使用方式（先启动节点: npx hardhat node）:
 *   set FAUCET_ADDRESS=0x你的小狐狸地址
 *   npx hardhat run scripts/faucet.ts --network localhost
 *
 * 或一行（PowerShell）:
 *   $env:FAUCET_ADDRESS="0x你的地址"; npx hardhat run scripts/faucet.ts --network localhost
 *
 * 或传入多个地址（空格分隔，仅第一个 env）:
 *   FAUCET_ADDRESS=0xAddr1 npx hardhat run scripts/faucet.ts --network localhost
 */
async function main() {
  const userAddress = process.env.FAUCET_ADDRESS?.trim();
  if (!userAddress || !ethers.isAddress(userAddress)) {
    console.log("\n用法: 设置环境变量 FAUCET_ADDRESS 为你的钱包地址后再运行");
    console.log("  PowerShell: $env:FAUCET_ADDRESS=\"0x你的地址\"; npx hardhat run scripts/faucet.ts --network localhost");
    console.log("  CMD:        set FAUCET_ADDRESS=0x你的地址 && npx hardhat run scripts/faucet.ts --network localhost");
    console.log("");
    process.exit(1);
  }

  console.log("\n=== 本地测试水龙头 ===\n");
  console.log("目标地址:", userAddress);

  const addressesPath = path.join(__dirname, "..", "deployed-addresses-local.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ 未找到 deployed-addresses-local.json，请先部署合约（如 deploy-local-test 或 deploy-all --network localhost）");
    process.exit(1);
  }

  const addrs = JSON.parse(fs.readFileSync(addressesPath, "utf-8")) as Record<string, string>;
  const usdtAddress = addrs.TestUSDT;
  const rwaAddress = addrs.RWAToken;
  if (!usdtAddress || !rwaAddress) {
    console.error("❌ 部署文件中缺少 TestUSDT 或 RWAToken");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("操作账户（部署者）:", deployer.address);

  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const usdt = TestUSDT.attach(usdtAddress);
  const rwa = RWAToken.attach(rwaAddress);

  const usdtAmount = ethers.parseUnits("100000", 6);   // 100,000 USDT
  const rwaAmount = ethers.parseEther("500000");       // 500,000 RWA

  // Mint USDT（TestUSDT 的 owner 可 mint）
  try {
    const balBefore = await usdt.balanceOf(userAddress);
    const txMint = await usdt.mint(userAddress, usdtAmount);
    await txMint.wait();
    const balAfter = await usdt.balanceOf(userAddress);
    console.log("\n✅ USDT 已到账:", ethers.formatUnits(balAfter, 6), "USDT");
  } catch (e: any) {
    console.error("❌ USDT mint 失败:", e.message || e);
  }

  // 从部署者转 RWA 给用户
  try {
    const deployerRwa = await rwa.balanceOf(deployer.address);
    if (deployerRwa < rwaAmount) {
      console.log("\n⚠️ 部署者 RWA 不足，只转现有余额:", ethers.formatEther(deployerRwa), "RWA");
      const txTransfer = await rwa.transfer(userAddress, deployerRwa);
      await txTransfer.wait();
    } else {
      const txTransfer = await rwa.transfer(userAddress, rwaAmount);
      await txTransfer.wait();
      console.log("✅ RWA 已到账:", ethers.formatEther(rwaAmount), "RWA");
    }
    const userRwa = await rwa.balanceOf(userAddress);
    console.log("   当前 RWA 余额:", ethers.formatEther(userRwa), "RWA");
  } catch (e: any) {
    console.error("❌ RWA 转账失败:", e.message || e);
  }

  console.log("\n=== 完成 ===\n");
  console.log("小狐狸里切到 Hardhat Local 网络即可看到余额并测试。");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
