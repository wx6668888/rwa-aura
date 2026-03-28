const ethers = require('ethers');

const RWA_TOKEN = '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
const RELAYER_PRIVATE_KEY = '0x9a2f3826f739dc9eef5ff5e513df23445adc8db7ad5373a01121fc2b3e6d832a';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
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
  
  const rwaBalanceNum = parseFloat(ethers.formatEther(rwaBalance));
  
  if (rwaBalanceNum >= maxNeed) {
    console.log('\n✅ 余额充足！可以执行全部任务。');
    return true;
  } else if (rwaBalanceNum >= minNeed) {
    console.log(`\n⚠️ 余额可能不足（当前 ${rwaBalanceNum.toFixed(2)} RWA）`);
    console.log('   但至少可以完成部分任务。');
    return true;
  } else {
    console.log(`\n❌ 余额不足！（当前 ${rwaBalanceNum.toFixed(2)} RWA < 需要 ${minNeed} RWA）`);
    return false;
  }
}

checkBalance()
  .then(result => process.exit(result ? 0 : 1))
  .catch(error => {
    console.error('检查失败:', error.message);
    process.exit(1);
  });
