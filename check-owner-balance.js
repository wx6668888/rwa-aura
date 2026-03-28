const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  
  console.log("Owner地址:", signer.address);
  console.log("BNB余额:", ethers.formatEther(balance), "BNB");
  
  if (balance === 0n) {
    console.log("\n❌ 余额为0，无法支付gas费！");
  }
}

main().catch(console.error);
