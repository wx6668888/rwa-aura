import { PreciseYieldCalculator } from './src/services/PreciseYieldCalculator';

async function testCalculation() {
  const calculator = new PreciseYieldCalculator();
  const userAddress = '0xtest';
  
  const day1_10am = 1710000000;
  const day2_8am = day1_10am + 79200;
  
  console.log('=== 测试RWA收益计算 ===');
  const rwaResult = await calculator.calculateYield(userAddress, 'RWA', day1_10am, day2_8am);
  console.log('RWA总收益:', parseFloat(rwaResult.totalYield) / 1e18, 'RWA');
  console.log('\n详细计算:');
  console.log(JSON.stringify(rwaResult.details, null, 2));
  
  console.log('\n=== 测试USDT收益计算 ===');
  const usdtResult = await calculator.calculateYield(userAddress, 'USDT', day1_10am, day2_8am);
  console.log('USDT总收益:', parseFloat(usdtResult.totalYield) / 1e18, 'RWA');
  console.log('\n详细计算:');
  console.log(JSON.stringify(usdtResult.details, null, 2));
  
  console.log('\n=== 总收益 ===');
  const total = parseFloat(rwaResult.totalYield) / 1e18 + parseFloat(usdtResult.totalYield) / 1e18;
  console.log('总计:', total, 'RWA');
  
  process.exit(0);
}

testCalculation();
