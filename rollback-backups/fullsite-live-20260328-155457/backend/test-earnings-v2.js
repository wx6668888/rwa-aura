const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001';
const TEST_ADDRESS = '0xCD5b97505499B1575e481446384430bb159851b6';

async function testV2API() {
  console.log('🧪 测试 Earnings v2 API\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/v2/earnings/${TEST_ADDRESS}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ v2 API 成功！');
      console.log('');
      console.log('📊 数据来源:', data.source);
      console.log('');
      console.log('💰 USDT质押的RWA待领取:', Number(data.data.usdtRwaPending) / 1e18, 'RWA');
      console.log('💰 RWA质押的RWA待领取:', Number(data.data.rwaRwaPending) / 1e18, 'RWA');
      console.log('💰 总待领取:', Number(data.data.totalRwaPending) / 1e18, 'RWA');
      console.log('');
      console.log('🕐 最后更新:', data.data.lastUpdated);
    } else {
      console.log('❌ v2 API 失败:', data.message || data.error);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

testV2API();
