import { ethers } from "hardhat";

async function main() {
  console.log("🧪 测试推荐功能设置\n");

  // 获取合约地址
  const STAKING_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const USDT_CONTRACT = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // 获取账户
  const [deployer, account1, account2, account3] = await ethers.getSigners();

  console.log("📋 测试账户信息:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Deployer (你当前使用): ${deployer.address}`);
  console.log(`Account #1 (推荐人):    ${account1.address}`);
  console.log(`Account #2 (备用):      ${account2.address}`);
  console.log(`Account #3 (备用):      ${account3.address}\n`);

  // 获取合约实例
  const stakingContract = await ethers.getContractAt("StakingContract", STAKING_CONTRACT);
  const usdtContract = await ethers.getContractAt("TestUSDT", USDT_CONTRACT);

  // 检查余额
  console.log("💰 USDT 余额检查:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const deployerBalance = await usdtContract.balanceOf(deployer.address);
  const account1Balance = await usdtContract.balanceOf(account1.address);
  const account2Balance = await usdtContract.balanceOf(account2.address);
  
  console.log(`Deployer: ${ethers.formatUnits(deployerBalance, 6)} USDT`);
  console.log(`Account #1: ${ethers.formatUnits(account1Balance, 6)} USDT`);
  console.log(`Account #2: ${ethers.formatUnits(account2Balance, 6)} USDT\n`);

  // 检查推荐人状态
  console.log("🔗 推荐关系检查:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  try {
    const deployerReferrer = await stakingContract.referrers(deployer.address);
    if (deployerReferrer === ethers.ZeroAddress) {
      console.log(`✅ Deployer 还没有绑定推荐人，可以设置推荐人`);
    } else {
      console.log(`⚠️  Deployer 已绑定推荐人: ${deployerReferrer}`);
    }
  } catch (error) {
    console.log(`✅ Deployer 还没有绑定推荐人，可以设置推荐人`);
  }

  try {
    const account1Referrer = await stakingContract.referrers(account1.address);
    if (account1Referrer === ethers.ZeroAddress) {
      console.log(`✅ Account #1 还没有绑定推荐人`);
    } else {
      console.log(`⚠️  Account #1 已绑定推荐人: ${account1Referrer}`);
    }
  } catch (error) {
    console.log(`✅ Account #1 还没有绑定推荐人`);
  }

  console.log("\n📝 推荐测试方案:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("方案 1: Deployer 质押，Account #1 作为推荐人");
  console.log(`  - 质押账户: ${deployer.address}`);
  console.log(`  - 推荐人:   ${account1.address}`);
  console.log(`  - 推荐人将获得质押金额的推荐奖励\n`);

  console.log("方案 2: Account #1 质押，Account #2 作为推荐人");
  console.log(`  - 质押账户: ${account1.address}`);
  console.log(`  - 推荐人:   ${account2.address}`);
  console.log(`  - 可以测试多层级推荐关系\n`);

  console.log("🎯 推荐使用的推荐人地址:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`${account1.address}`);
  console.log("\n✅ 测试准备完成！");
  console.log("\n📌 下一步:");
  console.log("1. 在质押页面输入推荐人地址");
  console.log("2. 输入质押金额（例如: 1000 USDT）");
  console.log("3. 选择锁仓期限");
  console.log("4. 授权并质押");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
