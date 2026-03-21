import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  
  const user1Addr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  const usdtAddr = "0xfaAddC93baf78e89DCf37bA67943E1bE8F37Bb8c"
  const rwaAddr = "0x276C216D241856199A83bf27b2286659e5b877D3"
  
  const usdt = await ethers.getContractAt("MockERC20", usdtAddr)
  const rwa = await ethers.getContractAt("MockERC20", rwaAddr)
  
  console.log("=== 给 user1 转账 ===")
  console.log("user1:", user1Addr)
  
  await usdt.transfer(user1Addr, ethers.parseUnits("20000", 6))
  console.log("✅ 已转 20,000 USDT")
  
  await rwa.transfer(user1Addr, ethers.parseUnits("2000", 18))
  console.log("✅ 已转 2,000 RWA")
  
  const usdtBalance = await usdt.balanceOf(user1Addr)
  const rwaBalance = await rwa.balanceOf(user1Addr)
  
  console.log("\nuser1 余额:")
  console.log("USDT:", Number(usdtBalance) / 1e6)
  console.log("RWA:", Number(rwaBalance) / 1e18)
}

main().catch(console.error)
