import { ethers } from "hardhat";

async function main() {
  const targetAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  // 合约地址
  const usdtAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const rwaAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  console.log("========================================");
  console.log("验证代币余额");
  console.log("========================================\n");
  console.log(`目标地址: ${targetAddress}\n`);
  
  // 获取 USDT 合约
  const usdt = await ethers.getContractAt("TestUSDT", usdtAddress);
  const usdtBalance = await usdt.balanceOf(targetAddress);
  console.log(`USDT 余额: ${ethers.formatUnits(usdtBalance, 18)} USDT`);
  
  // 获取 RWA 合约
  const rwa = await ethers.getContractAt("RWAToken", rwaAddress);
  const rwaBalance = await rwa.balanceOf(targetAddress);
  console.log(`RWA 余额:  ${ethers.formatUnits(rwaBalance, 18)} RWA`);
  
  console.log("\n========================================");
  
  if (rwaBalance < ethers.parseUnits("100000", 18)) {
    console.log("⚠️  警告: RWA 余额少于预期!");
    console.log("预期: 1,000,000,000 RWA");
    console.log(`实际: ${ethers.formatUnits(rwaBalance, 18)} RWA`);
  } else {
    console.log("✅ 代币余额正常!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
