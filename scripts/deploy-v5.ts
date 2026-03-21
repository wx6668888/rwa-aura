import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log("éƒ¨ç½²è´¦æˆ·:", deployer.address)
  
  // 1. éƒ¨ç½² USDT (æ”¯æŒ Permit)
  console.log("\n1. éƒ¨ç½² USDT...")
  const USDT = await ethers.getContractFactory("TestUSDT")
  const usdt = await USDT.deploy()
  await usdt.waitForDeployment()
  const usdtAddr = await usdt.getAddress()
  console.log("USDT:", usdtAddr)
  
  // 2. éƒ¨ç½² RWA (æ”¯æŒ Permit)
  console.log("\n2. éƒ¨ç½² RWA...")
  const RWA = await ethers.getContractFactory("RWAToken")
  const initialSupply = ethers.parseEther("1000000000") // 10äº¿
  const rwa = await RWA.deploy(
    "RWA Token",
    "RWA",
    initialSupply,
    deployer.address, // treasury
    deployer.address  // liquidityFund
  )
  await rwa.waitForDeployment()
  const rwaAddr = await rwa.getAddress()
  console.log("RWA:", rwaAddr)
  
  // 3. ²¿Êğ StakingContract
  console.log("\n3. ²¿Êğ StakingContract...")
  const Staking = await ethers.getContractFactory("StakingContract")
  const staking = await Staking.deploy(
    usdtAddr,
    rwaAddr,
    deployer.address, // treasury
    deployer.address  // backend
  )
  await staking.waitForDeployment()
  const stakingAddr = await staking.getAddress()
  console.log("StakingContract:", stakingAddr)
  
  // 4. ÅäÖÃ RWA ºÏÔ¼
  console.log("\n4. ÅäÖÃ RWA...")
  await rwa.setStakingContract(stakingAddr)
  await rwa.setSwapContract(deployer.address) // ÁÙÊ±ÉèÖÃ
  console.log("? RWA ÅäÖÃÍê³É")
  
  console.log("\n=== ²¿ÊğÍê³É ===")
}

main().catch(console.error)
