const { ethers } = require('ethers');

const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

(async () => {
  const provider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
  
  console.log('=== BSC主网部署成本估算 ===');
  console.log('');
  
  // 获取当前gas价格
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log('当前Gas价格:', ethers.formatUnits(gasPrice, 'gwei'), 'Gwei');
  console.log('');
  
  // 估算各合约的gas消耗
  const estimates = {
    'RWA代币合约': 2000000,      // 约200万gas
    'StakingContract': 4000000,   // 约400万gas（较复杂）
    '合约初始化和配置': 500000    // 约50万gas
  };
  
  console.log('预估gas消耗：');
  let totalGas = 0n;
  
  for (const [name, gas] of Object.entries(estimates)) {
    const cost = gasPrice * BigInt(gas);
    const bnbCost = ethers.formatEther(cost);
    console.log(`  ${name}: ${gas.toLocaleString()} gas ≈ ${bnbCost} BNB`);
    totalGas += BigInt(gas);
  }
  
  console.log('');
  const totalCost = gasPrice * totalGas;
  const totalBnb = ethers.formatEther(totalCost);
  
  console.log('=== 总计 ===');
  console.log(`总Gas消耗: ${totalGas.toLocaleString()} gas`);
  console.log(`总成本: ${totalBnb} BNB`);
  console.log('');
  console.log('建议准备: ' + (parseFloat(totalBnb) * 1.5).toFixed(4) + ' BNB（含20%余量）');
})();
