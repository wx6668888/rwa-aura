const { ethers } = require("hardhat");

async function main() {
  const oldStakingAddr = "0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175";
  
  console.log("=== 查询旧合约链上数据 ===");
  console.log("合约地址:", oldStakingAddr);
  
  const staking = await ethers.getContractAt("StakingContract", oldStakingAddr);
  
  // 查询全局统计
  const totalStaked = await staking.totalStaked();
  const totalStakedRWA = await staking.totalStakedRWA();
  
  console.log("\n全局统计:");
  console.log("总质押USDT:", ethers.formatUnits(totalStaked, 6), "USDT");
  console.log("总质押RWA:", ethers.formatEther(totalStakedRWA), "RWA");
  
  // 查询合约地址
  const owner = await staking.owner();
  const backendAddress = await staking.backendAddress();
  const treasuryAddress = await staking.treasuryAddress();
  
  console.log("\n合约地址:");
  console.log("Owner:", owner);
  console.log("Backend:", backendAddress);
  console.log("Treasury:", treasuryAddress);
}

main().catch(console.error);
