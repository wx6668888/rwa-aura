const { ethers } = require("hardhat");

async function main() {
  const stakingAddress = "0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99";
  const staking = await ethers.getContractAt("StakingContract", stakingAddress);
  
  console.log("=== 合约地址检查 ===\n");
  console.log("StakingContract:", stakingAddress);
  
  try {
    const backendAddress = await staking.backendAddress();
    console.log("链上backendAddress:", backendAddress);
    
    const owner = await staking.owner();
    console.log("链上owner:", owner);
    
    const treasuryAddress = await staking.treasuryAddress();
    console.log("链上treasuryAddress:", treasuryAddress);
    
    console.log("\n=== 对比 ===");
    console.log("你的地址:", "0x8927e74e0fCaED1D4C87116C805464800651f222");
    console.log("被盗地址:", "0x08Ea66321c4dd47468c3aDc55d06c5De7129A292");
  } catch (e) {
    console.error("查询失败:", e.message);
  }
}

main().catch(console.error);
