const { ethers } = require("hardhat");

async function main() {
  const oldStakingAddress = "0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175";
  
  console.log("=== 查询旧合约质押事件 ===");
  console.log("合约地址:", oldStakingAddress);
  
  // 查询Staked事件
  const staking = await ethers.getContractAt("StakingContract", oldStakingAddress);
  
  // 获取部署区块
  const deployBlock = 87000000; // 大约的部署区块
  const latestBlock = await ethers.provider.getBlockNumber();
  
  console.log("查询区块范围:", deployBlock, "到", latestBlock);
  
  // 查询Staked事件
  const filter = staking.filters.Staked();
  const events = await staking.queryFilter(filter, deployBlock, latestBlock);
  
  console.log("\n找到", events.length, "条质押事件");
  
  // 显示前5条
  for (let i = 0; i < Math.min(5, events.length); i++) {
    const e = events[i];
    console.log(`\n事件 ${i + 1}:`);
    console.log("  用户:", e.args.user);
    console.log("  金额:", ethers.formatEther(e.args.amount), "RWA");
    console.log("  区块:", e.blockNumber);
  }
}

main().catch(console.error);
