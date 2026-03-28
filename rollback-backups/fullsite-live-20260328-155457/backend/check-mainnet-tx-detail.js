const https = require('https');

const address = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const result = JSON.parse(data);
    
    if (result.status === '1' && result.result) {
      console.log('=== BSC主网交易详情 ===');
      console.log(`地址: ${address}`);
      console.log(`总交易数: ${result.result.length}`);
      console.log('');
      
      result.result.forEach((tx, index) => {
        const date = new Date(parseInt(tx.timeStamp) * 1000);
        const value = (parseInt(tx.value) / 1e18).toFixed(6);
        const gasUsed = (parseInt(tx.gasUsed) * parseInt(tx.gasPrice) / 1e18).toFixed(6);
        
        console.log(`--- 交易 #${index + 1} ---`);
        console.log(`时间: ${date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
        console.log(`交易哈希: ${tx.hash}`);
        console.log(`发送方: ${tx.from}`);
        console.log(`接收方: ${tx.to}`);
        console.log(`金额: ${value} BNB`);
        console.log(`Gas费: ${gasUsed} BNB`);
        console.log(`状态: ${tx.isError === '0' ? '成功' : '失败'}`);
        console.log('');
      });
    } else {
      console.log('查询失败:', result.message);
    }
  });
}).on('error', (err) => {
  console.log('请求错误:', err.message);
});
