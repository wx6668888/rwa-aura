const { ethers } = require('hardhat');
const axios = require('axios');

// 配置
const RWA_TOKEN = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
const STAKING_CONTRACT = '0xED24C652266674beF1514a671263b78628ec766e';
const BACKEND_URL = 'http://localhost:3001'; // 根据实际情况调整
const CHAIN_ID = 56; // BSC Mainnet

async function main() {
  console.log('=== 批量创建测试用户并质押（Gasless）===\n');

  // 获取owner
  const [owner] = await ethers.getSigners();
  console.log('Owner地址:', owner.address);

  // 获取RWA Token合约
  const RWAToken = await ethers.getContractAt('RWAToken', RWA_TOKEN);
  
  // 检查余额
  const ownerBalance = await RWAToken.balanceOf(owner.address);
  console.log(`Owner RWA余额: ${ethers.formatEther(ownerBalance)} RWA\n`);

  const testUsers = [];

  // 生成10个地址
  console.log('📝 生成10个测试账户...\n');
  for (let i = 0; i < 10; i++) {
    const wallet = ethers.Wallet.createRandom();
    const amount = Math.floor(Math.random() * (3000 - 150 + 1)) + 150;
    
    testUsers.push({
      index: i + 1,
      address: wallet.address,
      privateKey: wallet.privateKey,
      amount: amount,
      wallet: new ethers.Wallet(wallet.privateKey)
    });
    
    console.log(`账户 ${i + 1}:`);
    console.log(`  地址: ${wallet.address}`);
    console.log(`  金额: ${amount} RWA`);
    console.log(`  私钥: ${wallet.privateKey}\n`);
  }

  const totalAmount = testUsers.reduce((sum, u) => sum + u.amount, 0);
  console.log(`📊 总需求: ${totalAmount} RWA\n`);

  if (ownerBalance < ethers.parseEther(totalAmount.toString())) {
    throw new Error(`Owner RWA余额不足！需要 ${totalAmount} RWA`);
  }

  // 步骤1：转账RWA到所有账户
  console.log('💰 步骤1/2: 批量转账RWA...\n');
  for (const user of testUsers) {
    const amountWei = ethers.parseEther(user.amount.toString());
    console.log(`[${user.index}/10] 转账 ${user.amount} RWA 到 ${user.address}...`);
    
    const tx = await RWAToken.transfer(user.address, amountWei);
    await tx.wait();
    console.log(`  ✅ 完成: ${tx.hash}\n`);
  }

  console.log('✅ 所有转账完成！\n');

  // 步骤2：Gasless质押
  console.log('🔐 步骤2/2: 批量Gasless质押（不锁仓）...\n');
  
  const provider = ethers.provider;
  const successfulStakes = [];
  const failedStakes = [];

  for (const user of testUsers) {
    console.log(`[${user.index}/10] 为 ${user.address} 执行Gasless质押...`);
    
    try {
      const amountWei = ethers.parseEther(user.amount.toString());
      const lockDays = 0; // 不锁仓
      const referrer = ethers.ZeroAddress; // 无推荐人
      
      // 获取nonce
      const StakingContract = await ethers.getContractAt('StakingContract', STAKING_CONTRACT);
      const nonce = await StakingContract.nonces(user.address);
      
      // 设置deadline（10分钟后过期）
      const deadline = Math.floor(Date.now() / 1000) + 600;
      
      // 构建permit签名数据
      const permitDomain = {
        name: 'RWA Token',
        version: '1',
        chainId: CHAIN_ID,
        verifyingContract: RWA_TOKEN
      };
      
      const permitTypes = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      };
      
      const permitValue = {
        owner: user.address,
        spender: STAKING_CONTRACT,
        value: amountWei,
        nonce: nonce,
        deadline: deadline
      };
      
      console.log('  1/2 生成permit签名...');
      const permitSig = await user.wallet.signTypedData(permitDomain, permitTypes, permitValue);
      const permitSplit = ethers.Signature.from(permitSig);
      
      console.log('  2/2 调用Gasless质押API...');
      
      // 调用backend API
      const response = await axios.post(`${BACKEND_URL}/api/relayer/meta-stake-permit`, {
        user: user.address,
        amount: amountWei.toString(),
        referrer: referrer,
        lockPeriod: lockDays,
        deadline: deadline,
        v: permitSplit.v,
        r: permitSplit.r,
        s: permitSplit.s,
        signature: permitSig
      }, {
        timeout: 30000
      });
      
      if (response.data.success) {
        console.log(`  ✅ 质押成功！`);
        console.log(`  📝 交易哈希: ${response.data.txHash}\n`);
        successfulStakes.push({
          address: user.address,
          amount: user.amount,
          txHash: response.data.txHash
        });
      } else {
        throw new Error(response.data.error || '未知错误');
      }
      
    } catch (error) {
      console.error(`  ❌ 质押失败: ${error.message}\n`);
      failedStakes.push({
        address: user.address,
        amount: user.amount,
        error: error.message
      });
    }
    
    // 避免API限流，每次质押后等待2秒
    if (user.index < 10) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 汇总报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 执行汇总报告');
  console.log('='.repeat(60) + '\n');
  
  console.log(`✅ 成功质押: ${successfulStakes.length}/10`);
  console.log(`❌ 失败质押: ${failedStakes.length}/10\n`);
  
  if (successfulStakes.length > 0) {
    console.log('成功列表:');
    successfulStakes.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.address} | ${s.amount} RWA | ${s.txHash}`);
    });
    console.log();
  }
  
  if (failedStakes.length > 0) {
    console.log('失败列表:');
    failedStakes.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.address} | ${f.amount} RWA | ${f.error}`);
    });
    console.log();
  }

  // 保存完整信息
  const fs = require('fs');
  const saveData = {
    timestamp: new Date().toISOString(),
    totalUsers: testUsers.length,
    totalAmount: totalAmount,
    successful: successfulStakes,
    failed: failedStakes,
    allUsers: testUsers.map(u => ({
      address: u.address,
      privateKey: u.privateKey,
      amount: u.amount
    }))
  };
  
  fs.writeFileSync(
    'test-staked-users.json',
    JSON.stringify(saveData, null, 2)
  );
  
  console.log('💾 完整信息已保存到: test-staked-users.json');
  console.log('\n✅ 全部完成！');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  });
