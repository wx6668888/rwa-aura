import { ethers } from "hardhat"

async function main() {
  const user1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  
  const usdt = await ethers.getContractAt("MockERC20", "0x6F6f570F45833E249e27022648a26F4076F48f78")
  const rwa = await ethers.getContractAt("MockERC20", "0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9")
  
  const usdtBal = await usdt.balanceOf(user1)
  const rwaBal = await rwa.balanceOf(user1)
  
  console.log("=== user1 余额 ===")
  console.log("USDT:", ethers.formatUnits(usdtBal, 6))
  console.log("RWA:", ethers.formatUnits(rwaBal, 18))
}

main().catch(console.error)
