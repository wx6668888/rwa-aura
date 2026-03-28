/**
 * 从 scripts/last-full-protocol-deploy-partial.json（或 last-full-protocol-deploy.json）读取地址，补全接线
 * npx hardhat run scripts/complete-full-protocol-wiring.ts --network bscMainnet
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const pFull = path.join(__dirname, "last-full-protocol-deploy.json");
  const pPartial = path.join(__dirname, "last-full-protocol-deploy-partial.json");
  const jsonPath = fs.existsSync(pFull) ? pFull : pPartial;
  if (!fs.existsSync(jsonPath)) throw new Error("缺少部署结果 JSON");
  const d = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<string, string>;

  const rwaAddress = d.rwaToken;
  const strwaAddress = d.stRWA;
  const treasuryContractAddr = d.treasuryContract;
  const stakingAddr = d.stakingContract;
  const refAddr = d.referralRewardPool;
  const swapAddr = d.swapContract;
  const urAddr = d.usdtRwaSwap;
  const backend = (process.env.BACKEND_ADDRESS || "").trim();
  if (!backend || !ethers.isAddress(backend)) throw new Error("Set BACKEND_ADDRESS");

  const feeData = await ethers.provider.getFeeData();
  const gasPrice =
    feeData.gasPrice ?? feeData.maxFeePerGas ?? ethers.parseUnits("3", "gwei");

  const rwa = await ethers.getContractAt("RWAToken", rwaAddress, deployer);
  const strwa = await ethers.getContractAt("StRWA", strwaAddress, deployer);
  const treasuryC = await ethers.getContractAt("TreasuryContract", treasuryContractAddr, deployer);
  const staking = await ethers.getContractAt("StakingContract", stakingAddr, deployer);

  console.log("Wiring staking:", stakingAddr);

  const curStakingOnStrwa = await strwa.stakingContract();
  if (curStakingOnStrwa.toLowerCase() !== stakingAddr.toLowerCase()) {
    const tx = await strwa.setStakingContract(stakingAddr, { gasPrice });
    await tx.wait();
    console.log("StRWA.setStakingContract ok");
  } else {
    console.log("StRWA.setStakingContract skip (already set)");
  }

  let tx = await treasuryC.setStakingContractAddress(stakingAddr, { gasPrice });
  await tx.wait();
  console.log("TreasuryContract.setStakingContractAddress ok");

  tx = await rwa.setStakingContract(stakingAddr, { gasPrice });
  await tx.wait();
  console.log("RWAToken.setStakingContract ok");

  const wl = [stakingAddr, treasuryContractAddr, swapAddr, urAddr, ethers.getAddress(backend)];
  for (const a of wl) {
    tx = await rwa.setWhitelist(a, true, { gasPrice });
    await tx.wait();
  }
  console.log("RWAToken whitelist ok");

  tx = await staking.setReferralRewardPool(refAddr, { gasPrice });
  await tx.wait();
  console.log("Staking.setReferralRewardPool ok");

  tx = await staking.setStRWAToken(strwaAddress, { gasPrice });
  await tx.wait();
  console.log("Staking.setStRWAToken ok");

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
