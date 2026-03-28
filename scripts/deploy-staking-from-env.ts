import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 仅部署 StakingContract（与合约 constructor 四个参数一致）
 *
 * 本地（需先 npx hardhat node）:
 *   USDT_TOKEN_ADDRESS=0x... RWA_TOKEN_ADDRESS=0x... TREASURY_ADDRESS=0x... BACKEND_ADDRESS=0x... \
 *   npx hardhat run scripts/deploy-staking-from-env.ts --network localhost
 *
 * BSC 主网（.env 里 PRIVATE_KEY + BSC_MAINNET_RPC_URL）:
 *   同上环境变量 + npx hardhat run scripts/deploy-staking-from-env.ts --network bscMainnet
 *
 * 测试网: --network bscTestnet
 */
function reqAddr(name: string): string {
  const v = (process.env[name] || "").trim();
  if (!v || !ethers.isAddress(v)) {
    throw new Error(`Missing or invalid ${name} (must be 0x address)`);
  }
  return ethers.getAddress(v);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const usdt = reqAddr("USDT_TOKEN_ADDRESS");
  const rwa = reqAddr("RWA_TOKEN_ADDRESS");
  const treasury = reqAddr("TREASURY_ADDRESS");
  const backend = reqAddr("BACKEND_ADDRESS");

  console.log("Network:", network.name, "chainId:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("USDT:", usdt);
  console.log("RWA:", rwa);
  console.log("Treasury:", treasury);
  console.log("Backend:", backend);

  const Factory = await ethers.getContractFactory("StakingContract");
  const staking = await Factory.deploy(usdt, rwa, treasury, backend);
  const deployTx = staking.deploymentTransaction();
  await staking.waitForDeployment();
  const addr = await staking.getAddress();
  let deployBlock: string | undefined;
  let deployTxHash: string | undefined;
  if (deployTx) {
    deployTxHash = deployTx.hash;
    const receipt = await deployTx.wait();
    deployBlock = receipt?.blockNumber?.toString();
  }

  console.log("\nStakingContract:", addr);
  if (deployBlock) console.log("Deploy block:", deployBlock);
  const out = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    stakingContract: addr,
    deployTxHash,
    deployBlock,
    usdtToken: usdt,
    rwaToken: rwa,
    treasuryAddress: treasury,
    backendAddress: backend,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };
  const outPath = path.join(__dirname, "last-staking-deploy.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote:", outPath);
  console.log("\nNext: 更新 backend .env STAKING_CONTRACT_ADDRESS 与前端 addresses；主网需验证源码与迁移用户资产。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
