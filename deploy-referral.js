const { ethers } = require("hardhat");

async function main() {
  console.log("=== 部署ReferralRewardPool合约 ===\n");
  
  const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
  const stakingAddress = "0x0000000000000000000000000000000000000000"; // 临时地址，稍后设置
  
  const ReferralFactory = await ethers.getContractFactory("ReferralRewardPool");
  console.log("正在部署ReferralRewardPool...");
  
  const referral = await ReferralFactory.deploy(usdtAddress, stakingAddress);
  await referral.waitForDeployment();
  
  const referralAddress = await referral.getAddress();
  console.log("✅ ReferralRewardPool已部署:", referralAddress);
  
  const fs = require('fs');
  fs.writeFileSync('/tmp/referral-address.txt', referralAddress);
}

main().catch(console.error);
