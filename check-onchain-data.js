const { ethers } = require("hardhat");

async function main() {
  const stakingAddress = "0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99";
  
  const staking = await ethers.getContractAt("StakingContract", stakingAddress);
  
  console.log("=== 链上数据查询 ===\n");
  
  // 查询全局统计
  const totalStaked = await staking.totalStaked();
  const totalStakedRWA = await staking.totalStakedRWA();
  
  console.log("总质押USDT:", ethers.formatUnits(totalStaked, 6), "USDT");
  console.log("总质押RWA:", ethers.formatEther(totalStakedRWA), "RWA");
  
  // 查询用户列表（从数据库获取）
  const users = [
    "0x77ee3f51f9e0c5c99db8ef9451eee1a382f7a340",
    "0x08Ea66321c4dd47468c3aDc55d06c5De7129A292"
  ];
  
  console.log("\n=== 用户数据 ===");
  for (const user of users) {
    try {
      const userInfo = await staking.users(user);
      console.log(`\n用户: ${user}`);
      console.log("  总质押:", ethers.formatUnits(userInfo.totalStaked, 6), "USDT");
      console.log("  推荐人:", userInfo.referrer);
    } catch (e) {
      console.log(`用户 ${user} 查询失败`);
    }
  }
}

main().catch(console.error);
