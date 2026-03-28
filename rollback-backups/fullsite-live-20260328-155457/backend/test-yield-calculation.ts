import { PreciseYieldCalculator } from './src/services/PreciseYieldCalculator';

async function testCalculateYield() {
  const calculator = new PreciseYieldCalculator();
  const userAddress = '0xcd5b97505499b1575e481446384430bb159851b6';
  
  // 计算从首次质押到发放时间的收益
  const fromTime = 1773398724; // 2026/3/13 17:12:04
  const toTime = 1773504006;   // 2026/3/15 00:00:06
  
  console.log('计算周期:');
  console.log('从:', new Date(fromTime * 1000).toLocaleString());
  console.log('到:', new Date(toTime * 1000).toLocaleString());
  console.log('时长:', (toTime - fromTime) / 86400, '天');
  
  const result = await calculator.calculateYield(userAddress, 'RWA', fromTime, toTime);
  
  console.log('\n计算结果:');
  console.log('总收益:', parseFloat(result.totalYield) / 1e18, 'RWA');
  console.log('\n详细计算:');
  console.log(JSON.stringify(result.details, null, 2));
}

testCalculateYield();
