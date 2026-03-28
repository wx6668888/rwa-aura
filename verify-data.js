const { ethers } = require("hardhat");

async function main() {
  const stakingAddr = "0xED24C652266674beF1514a671263b78628ec766e";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  console.log("=== 验证新合约数据 ===\n");
  
  // 检查几个用户
  const users = [
    "0x77ee3f51f9e0c5c99db8ef9451eee1a382f7a340",
    "0xf12341a66ebc9b3816e5081a03cf7f7e67216e6d",
    "0x0254ecc9d2dca521ed954d8eaeedb610fb9d85da"
  ];
  
  for (const user of users) {
    const rwaStake = await staking.rwaStakes(user);
    console.log(`用户: ${user}`);
    console.log(`  质押RWA: ${ethers.formatEther(rwaStake.totalStakedRWA)}`);
    console.log(`  节点等级: ${rwaStake.nodeLevel}`);
    console.log(`  激活状态: ${rwaStake.isActive}\n`);
  }
}

main().catch(console.error);
