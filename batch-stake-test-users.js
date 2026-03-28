const { ethers } = require('hardhat');

async function main() {
  console.log('=== 批量创建测试用户并质押 ===\n');

  // 合约地址
  const RWA_TOKEN = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
  const STAKING_CONTRACT = '0xED24C652266674beF1514a671263b78628ec766e';

  // 获取部署账户（owner）
  const [owner] = await ethers.getSigners();
  console.log('Owner地址:', owner.address);

  // 获取合约实例
  const RWAToken = await ethers.getContractAt('RWAToken', RWA_TOKEN);
  const StakingContract = await ethers.getContractAt('StakingContract', STAKING_CONTRACT);

  // 检查owner的RWA余额
  const ownerBalance = await RWAToken.balanceOf(owner.address);
  console.log(`Owner RWA余额: ${ethers.formatEther(ownerBalance)} RWA\n`);

  const testUsers = [];
  const amounts = [];

  // 生成10个随机地址和金额
  console.log('📝 生成测试账户...\n');
  for (let i = 0; i < 10; i++) {
    const wallet = ethers.Wallet.createRandom();
    const amount = Math.floor(Math.random() * (3000 - 150 + 1)) + 150;
    
    testUsers.push({
      address: wallet.address,
      privateKey: wallet.privateKey,
      amount: amount
    });
    amounts.push(amount);
    
    console.log(`账户 ${i + 1}: ${wallet.address}`);
    console.log(`  金额: ${amount} RWA`);
    console.log(`  私钥: ${wallet.privateKey}\n`);
  }

  // 计算总需求
  const totalAmount = amounts.reduce((a, b) => a + b, 0);
  console.log(`📊 总需求: ${totalAmount} RWA\n`);

  if (ownerBalance < ethers.parseEther(totalAmount.toString())) {
    throw new Error('Owner RWA余额不足！');
  }

  console.log('💰 开始转账RWA...\n');

  // 批量转账RWA
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    const amountWei = ethers.parseEther(user.amount.toString());
    
    console.log(`[${i + 1}/10] 转账 ${user.amount} RWA 到 ${user.address}...`);
    
    const tx = await RWAToken.transfer(user.address, amountWei);
    await tx.wait();
    
    console.log(`  ✅ 转账完成: ${tx.hash}\n`);
  }

  console.log('🔐 开始批量质押（不锁仓）...\n');

  // 批量质押（使用gasless方式）
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    const amountWei = ethers.parseEther(user.amount.toString());
    
    console.log(`[${i + 1}/10] 为 ${user.address} 质押 ${user.amount} RWA（不锁仓）...`);
    
    try {
      // 使用owner作为relayer，代理用户签名进行质押
      // 1. 先授权
      console.log('  1/3 Owner代理授权...');
      const approveTx = await RWAToken.connect(owner).approve(
        STAKING_CONTRACT,
        amountWei
      );
      await approveTx.wait();
      console.log(`  ✅ 授权完成`);
      
      // 2. Owner代理转账RWA到质押合约
      console.log('  2/3 Owner代理转账到质押合约...');
      const transferTx = await RWAToken.connect(owner).transfer(
        STAKING_CONTRACT,
        amountWei
      );
      await transferTx.wait();
      console.log(`  ✅ 转账完成`);
      
      // 3. Owner代理执行质押（lockDays = 0 表示不锁仓）
      console.log('  3/3 执行质押...');
      const stakeTx = await StakingContract.connect(owner).stakeFor(
        user.address,
        amountWei,
        0, // lockDays = 0（不锁仓）
        ethers.ZeroAddress // 无推荐人
      );
      const receipt = await stakeTx.wait();
      
      console.log(`  ✅ 质押完成: ${stakeTx.hash}`);
      console.log(`  📈 Gas使用: ${receipt.gasUsed.toString()}\n`);
      
    } catch (error) {
      console.error(`  ❌ 质押失败: ${error.message}\n`);
    }
  }

  console.log('✅ 全部完成！\n');
  console.log('📋 账户汇总:');
  testUsers.forEach((user, i) => {
    console.log(`${i + 1}. ${user.address} | ${user.amount} RWA | 已质押（不锁仓）`);
  });
  
  // 保存账户信息到文件
  const fs = require('fs');
  fs.writeFileSync(
    'test-staked-users.json',
    JSON.stringify(testUsers, null, 2)
  );
  console.log('\n💾 账户信息已保存到: test-staked-users.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
