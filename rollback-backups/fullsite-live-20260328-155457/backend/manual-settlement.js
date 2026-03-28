const { DailySettlementService } = require('./src/services/DailySettlementService');
require('dotenv').config();

(async () => {
  console.log('=== 手动触发每日收益结算 ===');
  console.log('时间:', new Date().toLocaleString('zh-CN'));
  console.log('');
  
  const service = new DailySettlementService({
    rpcUrl: process.env.BSC_TESTNET_RPC_URL,
    stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS,
    backendPrivateKey: process.env.BACKEND_PRIVATE_KEY
  });
  
  try {
    console.log('开始执行每日结算...');
    await service.runDailySettlement();
    console.log('✅ 每日结算完成');
  } catch (error) {
    console.log('❌ 每日结算失败:', error.message);
    console.log('详细错误:', error);
  }
})();
