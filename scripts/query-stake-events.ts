import { ethers } from "hardhat";

async function main() {
  console.log("🔍 查询质押事件...\n");

  const STAKING_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  // 获取合约实例
  const stakingContract = await ethers.getContractAt("StakingContract", STAKING_ADDRESS);

  // 获取当前区块号
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("当前区块:", currentBlock);

  // 查询 StakeEvent 事件（从区块 0 到当前区块）
  const filter = stakingContract.filters.StakeEvent();
  const events = await stakingContract.queryFilter(filter, 0, currentBlock);

  console.log(`\n找到 ${events.length} 个质押事件:\n`);

  for (const event of events) {
    const block = await event.getBlock();
    const timestamp = new Date(block.timestamp * 1000);
    
    console.log("=" .repeat(60));
    console.log("质押事件:");
    console.log("  用户:", event.args?.user);
    console.log("  金额:", ethers.formatUnits(event.args?.amount || 0, 18), "USDT (内部精度)");
    console.log("  推荐人:", event.args?.referrer);
    console.log("  质押 ID:", event.args?.stakeId?.toString());
    console.log("  时间:", timestamp.toLocaleString('zh-CN'));
    console.log("  区块:", event.blockNumber);
    console.log("  交易哈希:", event.transactionHash);
    console.log("=" .repeat(60));
    console.log("");
  }

  // 查询用户质押信息
  const [deployer] = await ethers.getSigners();
  const userInfo = await stakingContract.getUserStakeInfo(deployer.address);
  
  console.log("\n用户质押信息:");
  console.log("  地址:", deployer.address);
  console.log("  总质押:", ethers.formatUnits(userInfo[0], 18), "USDT");
  console.log("  RWA 待领取:", ethers.formatUnits(userInfo[1], 18), "RWA");
  console.log("  USDT 奖励:", ethers.formatUnits(userInfo[2], 18), "USDT");
  console.log("  节点等级:", userInfo[5].toString());
  console.log("  推荐人:", userInfo[4]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
