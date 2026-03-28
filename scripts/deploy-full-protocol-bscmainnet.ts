/**
 * BSC 主网：一次性部署协议相关自有合约（不含 BSC 官方 USDT）
 *
 * 顺序：RWAToken → StRWA → TreasuryContract → StakingContract → ReferralRewardPool
 *      → TeamDividendPool → SwapContract → USDTRWASwap → LotteryContractSimple（可跳过）
 *
 * 依赖根目录 .env（hardhat.config 已 override）：
 *   PRIVATE_KEY, BSC_MAINNET_RPC_URL
 *   BACKEND_ADDRESS（日结钱包，须与 BACKEND_PRIVATE_KEY 一致）
 *   TREASURY_ADDRESS、LIQUIDITY_FUND_ADDRESS（RWA 构造函数；常用同一安全多签/EOA）
 *   USDT_TOKEN_ADDRESS（默认主网 USDT）
 *   TEAM_DIVIDEND_ADMIN_ADDRESS（可选，默认 deployer，须与 BACKEND 不同）
 *   RWA_INITIAL_SUPPLY（可选，默认 1_000_000_000 * 1e18）
 *   SKIP_LOTTERY=1 跳过彩票合约
 *
 * 输出：scripts/last-full-protocol-deploy.json
 */
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

function addr(name: string, fallback?: string): string {
  const v = (process.env[name] || fallback || "").trim();
  if (!v || !ethers.isAddress(v)) {
    throw new Error(`Missing or invalid ${name}`);
  }
  return ethers.getAddress(v);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const usdt = addr("USDT_TOKEN_ADDRESS", "0x55d398326f99059fF775485246999027B3197955");
  const treasuryWallet = addr("TREASURY_ADDRESS");
  const liqRaw = (process.env.LIQUIDITY_FUND_ADDRESS || "").trim();
  const liquidityFund =
    liqRaw && ethers.isAddress(liqRaw) ? ethers.getAddress(liqRaw) : treasuryWallet;
  const backend = addr("BACKEND_ADDRESS");
  const adminSigner = addr("TEAM_DIVIDEND_ADMIN_ADDRESS", deployer.address);
  if (adminSigner.toLowerCase() === backend.toLowerCase()) {
    throw new Error("TEAM_DIVIDEND_ADMIN_ADDRESS 不能与 BACKEND_ADDRESS 相同");
  }

  const rwaSupplyStr = process.env.RWA_INITIAL_SUPPLY || "";
  const initialSupply = rwaSupplyStr
    ? ethers.parseEther(rwaSupplyStr)
    : ethers.parseEther("1000000000");

  const feeData = await ethers.provider.getFeeData();
  const gasPrice =
    feeData.gasPrice ?? feeData.maxFeePerGas ?? ethers.parseUnits("3", "gwei");

  const out: Record<string, string> = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    usdtToken: usdt,
  };

  console.log("Deployer:", deployer.address);
  console.log("USDT:", usdt);
  console.log("RWA treasuryWallet (tax):", treasuryWallet);
  console.log("RWA liquidityFund:", liquidityFund);
  console.log("Backend (staking):", backend);
  console.log("TeamDividend adminSigner:", adminSigner);

  const rwaf = await ethers.getContractFactory("RWAToken");
  const rwa = await rwaf.deploy("RWA Token", "RWA", initialSupply, treasuryWallet, liquidityFund, {
    gasPrice,
  });
  await rwa.waitForDeployment();
  const rwaAddress = await rwa.getAddress();
  out.rwaToken = rwaAddress;
  console.log("RWAToken:", rwaAddress);

  const strwaf = await ethers.getContractFactory("StRWA");
  const strwa = await strwaf.deploy({ gasPrice });
  await strwa.waitForDeployment();
  const strwaAddress = await strwa.getAddress();
  out.stRWA = strwaAddress;
  console.log("StRWA:", strwaAddress);

  const tf = await ethers.getContractFactory("TreasuryContract");
  const treasuryC = await tf.deploy(usdt, { gasPrice });
  await treasuryC.waitForDeployment();
  const treasuryContractAddr = await treasuryC.getAddress();
  out.treasuryContract = treasuryContractAddr;
  console.log("TreasuryContract:", treasuryContractAddr);

  const sf = await ethers.getContractFactory("StakingContract");
  const staking = await sf.deploy(usdt, rwaAddress, treasuryContractAddr, backend, { gasPrice });
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  out.stakingContract = stakingAddr;
  console.log("StakingContract:", stakingAddr);

  const refF = await ethers.getContractFactory("ReferralRewardPool");
  const refPool = await refF.deploy(usdt, stakingAddr, { gasPrice });
  await refPool.waitForDeployment();
  const refAddr = await refPool.getAddress();
  out.referralRewardPool = refAddr;
  console.log("ReferralRewardPool:", refAddr);

  const reservedGas = ethers.parseUnits(process.env.TEAM_DIVIDEND_RESERVED_USDT || "1000", 6);
  const tdivF = await ethers.getContractFactory("TeamDividendPool");
  const tdiv = await tdivF.deploy(usdt, backend, adminSigner, reservedGas, { gasPrice });
  await tdiv.waitForDeployment();
  const tdivAddr = await tdiv.getAddress();
  out.teamDividendPool = tdivAddr;
  console.log("TeamDividendPool:", tdivAddr);

  const swapF = await ethers.getContractFactory("SwapContract");
  const swap = await swapF.deploy(rwaAddress, strwaAddress, { gasPrice });
  await swap.waitForDeployment();
  const swapAddr = await swap.getAddress();
  out.swapContract = swapAddr;
  console.log("SwapContract:", swapAddr);

  const urF = await ethers.getContractFactory("USDTRWASwap");
  const urSwap = await urF.deploy(usdt, rwaAddress, { gasPrice });
  await urSwap.waitForDeployment();
  const urAddr = await urSwap.getAddress();
  out.usdtRwaSwap = urAddr;
  console.log("USDTRWASwap:", urAddr);

  let lotteryAddr = "";
  if (process.env.SKIP_LOTTERY !== "1") {
    const lf = await ethers.getContractFactory("LotteryContractSimple");
    const lot = await lf.deploy(rwaAddress, treasuryWallet, { gasPrice });
    await lot.waitForDeployment();
    lotteryAddr = await lot.getAddress();
    out.lotteryContract = lotteryAddr;
    console.log("LotteryContractSimple:", lotteryAddr);
  } else {
    console.log("SKIP_LOTTERY=1，跳过彩票合约");
  }

  console.log("\n--- Wiring ---");
  let tx = await strwa.setStakingContract(stakingAddr, { gasPrice });
  await tx.wait();
  console.log("StRWA.setStakingContract ok");

  tx = await treasuryC.setStakingContractAddress(stakingAddr, { gasPrice });
  await tx.wait();
  console.log("TreasuryContract.setStakingContractAddress ok");

  tx = await rwa.setStakingContract(stakingAddr, { gasPrice });
  await tx.wait();
  console.log("RWAToken.setStakingContract ok");

  const wl = [stakingAddr, treasuryContractAddr, swapAddr, urAddr, backend];
  for (const a of wl) {
    tx = await rwa.setWhitelist(a, true, { gasPrice });
    await tx.wait();
  }
  console.log("RWAToken whitelist ok (", wl.length, ")");

  tx = await staking.setReferralRewardPool(refAddr, { gasPrice });
  await tx.wait();
  console.log("Staking.setReferralRewardPool ok");

  tx = await staking.setStRWAToken(strwaAddress, { gasPrice });
  await tx.wait();
  console.log("Staking.setStRWAToken ok");

  const stakingDeployTx = staking.deploymentTransaction();
  let deployBlock = "";
  if (stakingDeployTx) {
    const rc = await stakingDeployTx.wait();
    deployBlock = rc?.blockNumber?.toString() || "";
  }
  out.stakingDeployBlock = deployBlock;

  out.deployedAt = new Date().toISOString();

  const outPath = path.join(__dirname, "last-full-protocol-deploy.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("\nWrote", outPath);
  console.log("\n⚠️ 这是全新 RWA 代币与合约集，与旧地址资产不互通；请轮换所有泄露私钥并更新前后端 .env。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
