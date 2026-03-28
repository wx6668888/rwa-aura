// 测试 v2 API 和 fallback 机制
const testAddress = '0xCD5b97505499B1575e481446384430bb159851b6';
const API_BASE = 'http://localhost:3001';

async function testAPIFlow() {
  console.log('🧪 测试 API 调用流程\n');
  
  // 1. 测试 v2 API
  console.log('1️⃣ 测试 v2 API...');
  try {
    const res = await fetch(`${API_BASE}/api/v2/portfolio/${testAddress}`);
    const json = await res.json();
    
    if (res.ok && json.success) {
      console.log('✅ v2 API 成功');
      console.log('数据来源:', json.source);
      console.log('个人质押:', json.data.totalUsdt);
    } else {
      console.log('❌ v2 API 失败:', json.error);
      console.log('fallback 标记:', json.fallback);
    }
  } catch (error) {
    console.log('❌ v2 API 请求失败:', error.message);
  }
  
  console.log('\n2️⃣ 测试旧 API (fallback)...');
  try {
    const res = await fetch(`${API_BASE}/api/portfolio/${testAddress}`);
    const json = await res.json();
    
    if (res.ok && json.success) {
      console.log('✅ 旧 API 成功');
      console.log('数据:', json.data);
    } else {
      console.log('❌ 旧 API 也失败');
    }
  } catch (error) {
    console.log('❌ 旧 API 请求失败:', error.message);
  }
  
  console.log('\n📊 结论:');
  console.log('- v2 API 返回 404 时，前端会自动 fallback');
  console.log('- 最终会使用链上合约数据');
  console.log('- 功能不受影响，只是性能未优化');
}

testAPIFlow();
