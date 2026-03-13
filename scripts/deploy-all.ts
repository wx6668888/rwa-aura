import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log("=== 部署合约 ===\n")
  console.log("部署账户:", deployer.address)
  
  // 1. 部署 USDT
  console.log("\n1. 部署 USDT...")
  const USDT = await ethers.getContractFactory("MockERC20")
  const usdt = await USDT.deploy("USDT", "USDT", 6)
  await usdt.waitForDeployment()
  const usdtAddr = await usdt.getAddress()
  console.log("USDT:", usdtAddr)
  
  // 2. 部署 RWA
  console.log("\n2. 部署 RWA...")
  const RWA = await ethers.getContractFactory("MockERC20")
  const rwa = await RWA.deploy("RWA", "RWA", 18)
  await rwa.waitForDeployment()
  const rwaAddr = await rwa.getAddress()
  console.log("RWA:", rwaAddr)
  
  // 3. 部署 StakingContract
  console.log("\n3. 部署 StakingContract...")
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
  
  // 4. 部署 ReferralRewardPool
  console.log("\n4. 部署 ReferralRewardPool...")
  const Pool = await ethers.getContractFactory("ReferralRewardPool")
  const pool = await Pool.deploy(usdtAddr, stakingAddr)
  await pool.waitForDeployment()
  const poolAddr = await pool.getAddress()
  console.log("ReferralRewardPool:", poolAddr)
  
  // 5. 部署 TeamDividendPool
  console.log("\n5. 部署 TeamDividendPool...")
  const [, account1] = await ethers.getSigners()
  const Dividend = await ethers.getContractFactory("TeamDividendPool")
  const dividend = await Dividend.deploy(
    usdtAddr,
    deployer.address, // backendSigner
    account1.address,  // adminSigner (使用不同地址)
    ethers.parseUnits("1000", 6) // reservedGas: 1000 USDT
  )
  await dividend.waitForDeployment()
  const dividendAddr = await dividend.getAddress()
  console.log("TeamDividendPool:", dividendAddr)
  
  // 6. 配置
  console.log("\n6. 配置合约...")
  await staking.setReferralRewardPool(poolAddr)
  console.log("✅ 已设置推荐奖励池")
  
  // 7. 铸造测试代币
  console.log("\n7. 铸造测试代币...")
  await usdt.mint(deployer.address, ethers.parseUnits("100000", 6))
  await rwa.mint(deployer.address, ethers.parseUnits("100000", 18))
  console.log("✅ 已铸造 100,000 USDT 和 100,000 RWA")
  
  console.log("\n=== 部署完成 ===")
  console.log("USDT:", usdtAddr)
  console.log("RWA:", rwaAddr)
  console.log("StakingContract:", stakingAddr)
  console.log("ReferralRewardPool:", poolAddr)
  console.log("TeamDividendPool:", dividendAddr)
}

main().catch(console.error)
