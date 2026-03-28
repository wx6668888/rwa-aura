/**
 * 在本地 Hardhat 网络估算：
 * - migrationImportUserBundle（单用户、空锁仓数组）
 * - adminClawbackRwaStakePending
 *
 * 用法：npx hardhat run scripts/estimate-staking-migration-gas.ts --network hardhat
 *
 * 费用换算（主网）：feeWei = gasUsed * gasPriceWei
 * BSC 常见 gasPrice：1–5 gwei（实时用 bscscan 或 eth_gasPrice）
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const zero = ethers.ZeroAddress;

  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const usdt = await TestUSDT.deploy();
  await usdt.waitForDeployment();

  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwa = await RWAToken.deploy(
    "RWA",
    "RWA",
    ethers.parseEther("1000000"),
    deployer.address,
    deployer.address
  );
  await rwa.waitForDeployment();

  const Staking = await ethers.getContractFactory("StakingContract");
  const staking = await Staking.deploy(
    await usdt.getAddress(),
    await rwa.getAddress(),
    deployer.address,
    deployer.address
  );
  await staking.waitForDeployment();

  const u = deployer.address;
  const userAddr = "0x1111111111111111111111111111111111111111";

  const uInfo = {
    totalStaked: 0n,
    rwaPending: 0n,
    usdtRewards: 0n,
    lastWithdrawTime: 0n,
    referrer: zero,
    firstStakeTime: 0n,
    nodeLevel: 1,
    isActive: false,
  };
  const rInfo = {
    totalStakedRWA: 0n,
    rwaPending: ethers.parseEther("100"),
    lastWithdrawTime: 0n,
    referrer: zero,
    firstStakeTime: 0n,
    nodeLevel: 1,
    isActive: true,
  };

  await (await staking.setMigrationEnabled(true)).wait();

  const txM = await staking.migrationImportUserBundle(
    userAddr,
    uInfo,
    rInfo,
    [],
    [],
    0n,
    0n,
    0n,
    0n,
    [],
    0n,
    0n
  );
  const recM = await txM.wait();
  const gasM = recM!.gasUsed;

  const claw = ethers.parseEther("10");
  const txC = await staking.adminClawbackRwaStakePending(userAddr, claw);
  const recC = await txC.wait();
  const gasC = recC!.gasUsed;

  const gasPriceGwei = 3n;
  const weiPerMigrate = gasM * gasPriceGwei * 10n ** 9n;
  const weiPerClaw = gasC * gasPriceGwei * 10n ** 9n;

  console.log(JSON.stringify({
    network: "hardhat (本地，与主网逻辑一致，gas 近似)",
    migrationImportUserBundle_gasUsed: gasM.toString(),
    adminClawbackRwaStakePending_gasUsed: gasC.toString(),
    example_fee_wei_at_3gwei: {
      per_migration: weiPerMigrate.toString(),
      per_clawback: weiPerClaw.toString(),
    },
    example_fee_bnb_at_3gwei: {
      per_migration: ethers.formatEther(weiPerMigrate),
      per_clawback: ethers.formatEther(weiPerClaw),
    },
    note:
      "主网 StakingContract 体积接近 24KB 上限；批量迁移若写进主合约易超限。可另建辅助合约 + staking 白名单，或链下多分片交易。UUPS 需整体改为可升级合约并重新审计。",
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
