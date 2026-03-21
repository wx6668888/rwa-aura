const { ethers } = require('ethers');
require('dotenv').config();

const STAKING_ABI = [
  "function getUserStakeInfo(address user) view returns (uint256 totalStaked, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime)",
  "function rwaStakes(address user) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime)",
  "function usdtFlexibleTotalStaked(address user) view returns (uint256)",
  "function rwaFlexibleTotalStaked(address user) view returns (uint256)",
  "function getUSDTLockedPrincipals(address user) view returns (tuple(uint256 amount, uint256 lockPeriod, uint256 lockEndTime, bool withdrawn)[])",
  "function getRWALockedPrincipals(address user) view returns (tuple(uint256 amount, uint256 lockPeriod, uint256 lockEndTime, bool withdrawn)[])"
];

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  const contract = new ethers.Contract(process.env.STAKING_CONTRACT, STAKING_ABI, provider);
  
  const userAddr = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  console.log('=== 用户合约订单详情 ===');
  console.log('用户地址:', userAddr);
  console.log('');
  
  // 1. 总质押信息
  const usdtInfo = await contract.getUserStakeInfo(userAddr);
  const usdtTotal = Number(ethers.formatUnits(usdtInfo[0], 18));
  console.log('【USDT总质押】:', usdtTotal.toFixed(2), 'USDT');
  
  const rwaInfo = await contract.rwaStakes(userAddr);
  const rwaTotal = Number(ethers.formatUnits(rwaInfo[0], 18));
  console.log('【RWA总质押】:', rwaTotal.toFixed(2), 'RWA');
  console.log('');
  
  // 2. 灵活质押
  const usdtFlex = await contract.usdtFlexibleTotalStaked(userAddr);
  const usdtFlexAmount = Number(ethers.formatUnits(usdtFlex, 18));
  console.log('【USDT灵活质押】:', usdtFlexAmount.toFixed(2), 'USDT');
  
  const rwaFlex = await contract.rwaFlexibleTotalStaked(userAddr);
  const rwaFlexAmount = Number(ethers.formatUnits(rwaFlex, 18));
  console.log('【RWA灵活质押】:', rwaFlexAmount.toFixed(2), 'RWA');
  console.log('');
  
  // 3. USDT锁仓订单
  const usdtLocked = await contract.getUSDTLockedPrincipals(userAddr);
  console.log('【USDT锁仓订单】共', usdtLocked.length, '笔:');
  
  let usdtLockedActive = 0;
  let usdtLockedWithdrawn = 0;
  const now = Math.floor(Date.now() / 1000);
  
  usdtLocked.forEach((order, i) => {
    const amt = Number(ethers.formatUnits(order.amount, 18));
    const lockSeconds = Number(order.lockPeriod);
    const lockDays = lockSeconds / 86400;
    const endTime = Number(order.lockEndTime);
    const isExpired = endTime < now;
    const status = order.withdrawn ? '✅已提现' : (isExpired ? '⏰已到期' : '🔒锁仓中');
    
    if (order.withdrawn) {
      usdtLockedWithdrawn += amt;
    } else {
      usdtLockedActive += amt;
    }
    
    let timeStr = '无效时间';
    if (endTime > 0 && endTime < 2000000000) {
      timeStr = new Date(endTime * 1000).toLocaleString('zh-CN');
    }
    
    console.log(`  ${i+1}. ${amt.toFixed(2)} USDT | ${lockDays.toFixed(0)}天 | 到期: ${timeStr} | ${status}`);
  });
  
  console.log('');
  console.log('未提现锁仓:', usdtLockedActive.toFixed(2), 'USDT');
  console.log('已提现锁仓:', usdtLockedWithdrawn.toFixed(2), 'USDT');
  console.log('');
  
  // 4. 汇总
  console.log('=== 汇总 ===');
  console.log('USDT灵活:', usdtFlexAmount.toFixed(2));
  console.log('USDT锁仓（未提现）:', usdtLockedActive.toFixed(2));
  console.log('USDT总计:', (usdtFlexAmount + usdtLockedActive).toFixed(2));
  console.log('合约totalStaked:', usdtTotal.toFixed(2));
  console.log('');
  console.log('验证:', (usdtFlexAmount + usdtLockedActive) === usdtTotal ? '✅一致' : '❌不一致');
})();
