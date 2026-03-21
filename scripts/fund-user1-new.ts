import { ethers } from "hardhat"

async function main() {
  const user1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  
  const usdt = await ethers.getContractAt("MockERC20", "0xe1Fd27F4390DcBE165f4D60DBF821e4B9Bb02dEd")
  const rwa = await ethers.getContractAt("MockERC20", "0xc582Bc0317dbb0908203541971a358c44b1F3766")
  
  console.log("=== 给 user1 转账 ===")
  await usdt.transfer(user1, ethers.parseUnits("20000", 6))
  await rwa.transfer(user1, ethers.parseUnits("2000", 18))
  
  console.log("✅ 已转账 20,000 USDT 和 2,000 RWA 给 user1")
}

main().catch(console.error)
