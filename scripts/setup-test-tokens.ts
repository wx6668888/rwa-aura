import { ethers } from "hardhat";

async function main() {
  console.log("========================================");
  console.log("部署合约并分配代币");
  console.log("========================================\n");

  const targetAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  // 1. 部署 USDT
  console.log("1. 部署 TestUSDT...");
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const usdt = await TestUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log(`✓ TestUSDT 部署到: ${usdtAddress}`);

  // 2. 部署 RWA Token
  console.log("\n2. 部署 RWAToken...");
  const [deployer] = await ethers.getSigners();
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwa = await RWAToken.deploy(
    "RWA Token",
    "RWA",
    ethers.parseUnits("1000000000", 18), // 1 billion initial supply
    deployer.address, // treasury address
    deployer.address  // liquidity fund address
  );
  await rwa.waitForDeployment();
  const rwaAddress = await rwa.getAddress();
  console.log(`✓ RWAToken 部署到: ${rwaAddress}`);

  // 3. 部署 StakingContract
  console.log("\n3. 部署 StakingContract...");
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const staking = await StakingContract.deploy(
    usdtAddress,
    rwaAddress,
    deployer.address, // treasury address
    deployer.address  // backend address
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(`✓ StakingContract 部署到: ${stakingAddress}`);

  // 4. 给目标地址分配 USDT (100,000 USDT)
  console.log(`\n4. 给 ${targetAddress} 分配 USDT...`);
  const usdtAmount = ethers.parseUnits("100000", 18);
  const mintUsdtTx = await usdt.mint(targetAddress, usdtAmount);
  await mintUsdtTx.wait();
  const usdtBalance = await usdt.balanceOf(targetAddress);
  console.log(`✓ USDT 余额: ${ethers.formatUnits(usdtBalance, 18)} USDT`);

  // 5. 给目标地址分配 RWA (100,000 RWA)
  console.log(`\n5. 给 ${targetAddress} 分配 RWA...`);
  const rwaAmount = ethers.parseUnits("100000", 18);
  const transferRwaTx = await rwa.transfer(targetAddress, rwaAmount);
  await transferRwaTx.wait();
  const rwaBalance = await rwa.balanceOf(targetAddress);
  console.log(`✓ RWA 余额: ${ethers.formatUnits(rwaBalance, 18)} RWA`);

  // 6. 设置 StakingContract 为 RWA 的 minter
  console.log("\n6. 配置权限...");
  const whitelistTx = await rwa.setWhitelist(stakingAddress, true);
  await whitelistTx.wait();
  console.log(`✓ StakingContract 已加入白名单`);

  console.log("\n========================================");
  console.log("✅ 完成！");
  console.log("========================================");
  console.log("\n合约地址:");
  console.log(`USDT: ${usdtAddress}`);
  console.log(`RWA:  ${rwaAddress}`);
  console.log(`Staking: ${stakingAddress}`);
  console.log(`\n目标地址: ${targetAddress}`);
  console.log(`USDT 余额: ${ethers.formatUnits(usdtBalance, 18)}`);
  console.log(`RWA 余额:  ${ethers.formatUnits(rwaBalance, 18)}`);
  console.log("\n请更新前端配置文件中的合约地址！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
