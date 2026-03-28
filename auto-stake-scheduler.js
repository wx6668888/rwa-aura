const ethers = require('ethers');
const axios = require('axios');

// 配置
const RWA_TOKEN = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
const STAKING_CONTRACT = '0xED24C652266674beF1514a671263b78628ec766e';
const BACKEND_URL = 'http://localhost:3001';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';
const CHAIN_ID = 56;
const TOTAL_COUNT = 10;

const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;

async function executeOneStake(currentCount) {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 第 ${currentCount}/${TOTAL_COUNT} 次执行 - ${timestamp}`);
  console.log('='.repeat(70) + '\n');

  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  
  console.log('Owner地址:', ownerWallet.address);

  const RWAToken = new ethers.Contract(
    RWA_TOKEN,
    [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)'
    ],
    ownerWallet
  );

  const balance = await RWAToken.balanceOf(ownerWallet.address);
  console.log(`Owner RWA余额: ${ethers.formatEther(balance)} RWA\n`);

  // 生成1个新地址
  const wallet = ethers.Wallet.createRandom();
  const amount = Math.floor(Math.random() * (3000 - 150 + 1)) + 150;
  
  console.log('📝 生成新账户:');
  console.log(`  地址: ${wallet.address}`);
  console.log(`  金额: ${amount} RWA`);
  console.log(`  私钥: ${wallet.privateKey}\n`);

  const amountWei = ethers.parseEther(amount.toString());

  if (balance < amountWei) {
    throw new Error(`余额不足！需要 ${amount} RWA，当前只有 ${ethers.formatEther(balance)} RWA`);
  }

  // 步骤1：转账RWA
  console.log('💰 步骤1/2: 转账RWA...');
  const transferTx = await RWAToken.transfer(wallet.address, amountWei);
  await transferTx.wait();
  console.log(`  ✅ 转账成功: ${transferTx.hash}\n`);

  // 步骤2：Gasless质押（双签名）
  console.log('🔐 步骤2/2: Gasless质押（不锁仓）...');
  
  let stakeResult = { success: false, txHash: null, error: null };

  try {
    const lockDays = 0; // 不锁仓
    const deadline = Math.floor(Date.now() / 1000) + 600;
    
    // 获取nonce
    const StakingContract = new ethers.Contract(
      STAKING_CONTRACT,
      ['function nonces(address owner) view returns (uint256)'],
      provider
    );
    const nonce = await StakingContract.nonces(wallet.address);
    
    console.log('  1/3 生成RWA Token Permit签名...');
    // 1. RWA Token Permit签名（用于授权）
    const rwaPermitDomain = {
      name: 'RWA Token',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: RWA_TOKEN
    };
    
    const rwaPermitTypes = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };
    
    const rwaPermitValue = {
      owner: wallet.address,
      spender: STAKING_CONTRACT,
      value: amountWei,
      nonce: nonce,
      deadline: deadline
    };
    
    const rwaPermitSig = await wallet.signTypedData(rwaPermitDomain, rwaPermitTypes, rwaPermitValue);
    const permitSplit = ethers.Signature.from(rwaPermitSig);
    
    console.log('  2/3 生成StakeRWA签名...');
    // 2. StakeRWA签名（用于质押操作）
    const stakeRWADomain = {
      name: 'RWAStaking',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: STAKING_CONTRACT
    };
    
    const stakeRWATypes = {
      StakeRWA: [
        { name: 'user', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'referrer', type: 'address' },
        { name: 'lockPeriod', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };
    
    const stakeRWAValue = {
      user: wallet.address,
      amount: amountWei,
      referrer: ethers.ZeroAddress,
      lockPeriod: BigInt(lockDays),
      nonce: nonce,
      deadline: BigInt(deadline)
    };
    
    const stakeRWASig = await wallet.signTypedData(stakeRWADomain, stakeRWATypes, stakeRWAValue);
    
    console.log('  3/3 调用Gasless质押API...');
    // 3. 调用backend gasless API（使用meta-stake-rwa-permit endpoint）
    const response = await axios.post(`${BACKEND_URL}/api/meta-stake-rwa-permit`, {
      user: wallet.address,
      amount: amountWei.toString(),
      referrer: ethers.ZeroAddress,
      lockPeriod: lockDays,
      deadline: deadline,
      v: permitSplit.v,
      r: permitSplit.r,
      s: permitSplit.s,
      signature: stakeRWASig // StakeRWA签名
    }, { timeout: 30000 });
    
    if (response.data.success) {
      console.log(`  ✅ 质押成功: ${response.data.txHash}\n`);
      stakeResult = { success: true, txHash: response.data.txHash, error: null };
    } else {
      throw new Error(response.data.error || '未知错误');
    }
    
  } catch (error) {
    console.error(`  ❌ 质押失败: ${error.message}\n`);
    stakeResult = { success: false, txHash: null, error: error.message };
  }

  // 保存记录
  const fs = require('fs');
  const logFile = 'batch-stake-log.json';
  
  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  
  logs.push({
    count: currentCount,
    timestamp: timestamp,
    address: wallet.address,
    privateKey: wallet.privateKey,
    amount: amount,
    transferTxHash: transferTx.hash,
    stakeSuccess: stakeResult.success,
    stakeTxHash: stakeResult.txHash,
    stakeError: stakeResult.error
  });
  
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  console.log(`💾 记录已保存\n`);
  
  return stakeResult.success;
}

async function startScheduler() {
  console.log('🤖 自动质押调度器已启动');
  console.log(`📊 总计划: 生成 ${TOTAL_COUNT} 个地址并质押`);
  console.log('⏰ 间隔时间: 每10-30分钟随机\n');
  
  for (let i = 1; i <= TOTAL_COUNT; i++) {
    try {
      const success = await executeOneStake(i);
      
      if (success) {
        console.log(`✅ 第 ${i}/${TOTAL_COUNT} 次执行成功\n`);
      } else {
        console.log(`⚠️ 第 ${i}/${TOTAL_COUNT} 次执行部分失败（转账成功，质押失败）\n`);
      }
      
    } catch (error) {
      console.error(`\n❌ 第 ${i}/${TOTAL_COUNT} 次执行失败:`, error.message, '\n');
    }
    
    if (i < TOTAL_COUNT) {
      const waitMinutes = Math.floor(Math.random() * 21) + 10;
      const waitMs = waitMinutes * 60 * 1000;
      
      const nextTime = new Date(Date.now() + waitMs);
      console.log(`⏳ 等待 ${waitMinutes} 分钟后执行下一次...`);
      console.log(`⏰ 下次执行时间: ${nextTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
      console.log('='.repeat(70) + '\n');
      
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('🎉 全部10次执行完成！');
  console.log('='.repeat(70));
  console.log('\n📋 详细记录请查看: batch-stake-log.json\n');
}

if (!OWNER_PRIVATE_KEY) {
  console.error('❌ 错误: 请设置环境变量 OWNER_PRIVATE_KEY');
  process.exit(1);
}

startScheduler()
  .then(() => {
    console.log('✅ 调度器正常结束');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 调度器异常:', error);
    process.exit(1);
  });
