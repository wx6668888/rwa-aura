import { ethers } from "hardhat";

async function main() {
  console.log("部署 ReferralRewardPool 合约...");

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  const USDT_ADDRESS = "0xb2E5F116B70df3148b49CC4b25354A3DD723BAe2";
  const STAKING_CONTRACT = "0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE";

  const ReferralRewardPool = await ethers.getContractFactory("ReferralRewardPool");
  const pool = await ReferralRewardPool.deploy(USDT_ADDRESS, STAKING_CONTRACT);

  await pool.waitForDeployment();

  const address = await pool.getAddress();
  console.log("ReferralRewardPool 部署成功:", address);
  console.log("USDT地址:", USDT_ADDRESS);
  console.log("质押合约地址:", STAKING_CONTRACT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
