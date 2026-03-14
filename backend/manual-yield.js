// 直接调用DailyYieldService手动触发收益发放
require('dotenv').config();
const { DailyYieldService } = require('./dist/services/DailyYieldService');
const { PriceOracleService } = require('./dist/services/PriceOracleService');

(async () => {
  try {
    console.log('=== 手动触发收益发放 ===\n');
    
    // 初始化PriceOracleService
    const priceOracle = new PriceOracleService({
      rpcUrl: process.env.BSC_TESTNET_RPC_URL,
      pancakeRouterAddress: process.env.PANCAKE_ROUTER_ADDRESS,
      rwaTokenAddress: process.env.RWA_TOKEN_ADDRESS,
      usdtTokenAddress: process.env.USDT_TOKEN_ADDRESS,
    });
    
    // 初始化DailyYieldService
    const dailyYield = new DailyYieldService({
      baseYieldRate: 0.008,
      rpcUrl: process.env.BSC_TESTNET_RPC_URL,
      stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS,
      backendPrivateKey: process.env.BACKEND_PRIVATE_KEY,
      rwaTokenAddress: process.env.RWA_TOKEN_ADDRESS,
      usdtTokenAddress: process.env.USDT_TOKEN_ADDRESS,
      priceOracle: priceOracle,
    });
    
    console.log('开始计算收益...');
    const result = await dailyYield.calculateDailyYield();
    
    console.log('\n✅ 收益发放完成！');
    console.log('处理用户数:', result.processedUsers);
    console.log('总收益:', result.totalYield);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 发放失败:', err.message);
    process.exit(1);
  }
})();
