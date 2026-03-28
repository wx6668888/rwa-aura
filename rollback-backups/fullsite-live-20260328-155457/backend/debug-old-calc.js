const BigNumber = require('bignumber.js');

// 模拟旧系统的计算逻辑
const stakes = [
  { amount: '135000000000000000000', lock_period: 0 },
  { amount: '100000000000000000000', lock_period: 90 },
  { amount: '100000000000000000000', lock_period: 0 },
  { amount: '135000000000000000000', lock_period: 30 },
  { amount: '200000000000000000000', lock_period: 0 },
  { amount: '150000000000000000000', lock_period: 30 },
  { amount: '154000000000000000000', lock_period: 180 },
  { amount: '100000000000000000000', lock_period: 0 },
  { amount: '1000000000000000000000', lock_period: 0 },
  { amount: '500000000000000000000', lock_period: 0 },
  { amount: '1000000000000000000000', lock_period: 0 },
  { amount: '1000000000000000000000', lock_period: 0 },
  { amount: '120000000000000000000', lock_period: 90 }
];

const baseYieldRate = new BigNumber(0.008); // 0.8%
const rwaPrice = 0.85;

const getLockMultiplier = (lockPeriod) => {
  const multipliers = {
    0: 1.0,
    30: 1.3,
    90: 1.6,
    180: 2.0,
    365: 2.5
  };
  return multipliers[lockPeriod] || 1.0;
};

let totalRwaYield = new BigNumber(0);

console.log('=== 旧系统计算逻辑（错误）===\n');

stakes.forEach((stake, i) => {
  const stakeAmount = new BigNumber(stake.amount).dividedBy(1e18);
  const lockMultiplier = getLockMultiplier(stake.lock_period);
  const adjustedYieldRate = baseYieldRate.multipliedBy(lockMultiplier);
  
  // 错误：直接用年化收益率计算，没有除以365
  const usdtYield = stakeAmount.multipliedBy(adjustedYieldRate);
  const rwaYield = usdtYield.dividedBy(rwaPrice);
  
  totalRwaYield = totalRwaYield.plus(rwaYield);
  
  console.log(`${i+1}. ${stakeAmount.toFixed(2)} USDT, 锁仓${stake.lock_period}天`);
  console.log(`   收益率: ${adjustedYieldRate.multipliedBy(100).toFixed(2)}%`);
  console.log(`   收益: ${rwaYield.toFixed(8)} RWA (错误！)\n`);
});

console.log(`USDT质押总收益: ${totalRwaYield.toFixed(8)} RWA`);
console.log('\n=== 这就是为什么每次发放21.6 RWA！===');
console.log('应该除以365才是每天的收益！');
