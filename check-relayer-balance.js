const { ethers } = require('hardhat');

const RWA_TOKEN = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
const RELAYER_PRIVATE_KEY = '0x9a2f3826f739dc9eef5ff5e513df23445adc8db7ad5373a01121fc2b3e6d832a';

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider(
    process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org/'
  );
  
  const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
  
  console.log('Relayer地址:', wallet.address);
  
  // 检查BNB余额
  const bnbBalance = await provider.getBalance(wallet.address);
  console.log('BNB余额:', ethers.formatEther(bnbBalance), 'BNB');
  
  // 检查RWA余额
  const RWAToken = new ethers.Contract(
    RWA_TOKEN,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  
  const rwaBalance = await RWAToken.balanceOf(wallet.address);
  console.log('RWA余额:', ethers.formatEther(rwaBalance), 'RWA');
  
  // 计算需求
  const maxNeed = 3000 * 10; // 最多需要
  const minNeed = 150 * 10;  // 最少需要
  
  console.log('\n需求估算:');
  console.log('  最多需要:', maxNeed, 'RWA');
  console.log('  最少需要:', minNeed, 'RWA');
  
  if (rwaBalance >= ethers.parseEther(maxNeed.toString())) {
    console.log('\n✅ 余额充足！可以执行任务。');
  } else if (rwaBalance >= ethers.parseEther(minNeed.toString())) {
    console.log('\n⚠️ 余额可能不足以完成全部10次（如果每次都是3000 RWA）');
    console.log('   但至少可以完成几次任务。');
  } else {
    console.log('\n❌ 余额不足！无法执行任务。');
  }
}

checkBalance()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('检查失败:', error);
    process.exit(1);
  });
