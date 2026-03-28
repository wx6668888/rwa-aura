const axios = require('axios');

async function main() {
  const address = "0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175";
  
  // 获取所有交易
  const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=87000000&endblock=99999999&sort=asc`;
  
  const response = await axios.get(url);
  const txs = response.data.result;
  
  console.log(`总交易数: ${txs.length}\n`);
  
  // 分析交易类型
  const methodCounts = {};
  
  for (const tx of txs) {
    const method = tx.functionName ? tx.functionName.split('(')[0] : 'unknown';
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  }
  
  console.log("交易类型统计:");
  for (const [method, count] of Object.entries(methodCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${method}: ${count}条`);
  }
  
  console.log("\n所有交易详情:");
  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    const method = tx.functionName ? tx.functionName.split('(')[0] : 'unknown';
    console.log(`${i+1}. ${method} - Block: ${tx.blockNumber} - Hash: ${tx.hash.substring(0, 20)}...`);
  }
}

main().catch(console.error);
