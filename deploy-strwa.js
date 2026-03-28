const { ethers } = require("hardhat");

async function main() {
  console.log("=== 部署StRWA合约 ===\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("BNB余额:", ethers.formatEther(balance), "BNB\n");
  
  // 部署StRWA
  const StRWAFactory = await ethers.getContractFactory("StRWA");
  console.log("正在部署StRWA...");
  
  const stRWA = await StRWAFactory.deploy();
  await stRWA.waitForDeployment();
  
  const stRWAAddress = await stRWA.getAddress();
  console.log("✅ StRWA已部署:", stRWAAddress);
  
  // 保存地址
  const fs = require('fs');
  fs.writeFileSync('/tmp/strwa-address.txt', stRWAAddress);
}

main().catch(console.error);
