// 手动触发收益发放
const fetch = require('node-fetch');

(async () => {
  try {
    console.log('正在手动触发收益发放...');
    
    // 调用后端API手动触发
    const response = await fetch('http://localhost:3001/api/admin/trigger-daily-yield', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    console.log('结果:', result);
    
  } catch (err) {
    console.error('触发失败:', err.message);
    console.log('\n提示：如果API不存在，需要在后端添加手动触发接口');
  }
})();
