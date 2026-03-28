const { ethers } = require("hardhat");

async function main() {
  const stakingAddr = "0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99";
  const staking = await ethers.getContractAt("StakingContract", stakingAddr);
  
  console.log("检查合约状态...\n");
  
  const paused = await staking.paused();
  console.log("合约是否暂停:", paused);
  
  const migrationEnabled = await staking.migrationEnabled();
  console.log("迁移模式:", migrationEnabled);
  
  const owner = await staking.owner();
  const [signer] = await ethers.getSigners();
  console.log("\n合约owner:", owner);
  console.log("当前签名者:", signer.address);
  console.log("是否匹配:", owner.toLowerCase() === signer.address.toLowerCase());
}

main().catch(console.error);
