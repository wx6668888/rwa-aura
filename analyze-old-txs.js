const axios = require('axios');

async function main() {
  const address = "0x8FA4A4BE954a80c940623DDa1ed6e3D50FC25175";
  
  const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=87000000&endblock=99999999&sort=asc`;
  
  const response = await axios.get(url);
  const txs = response.data.result;
  
  console.log("总交易数:", txs.length);
  console.log("\n前20条交易：\n");
  
  for (let i = 0; i < Math.min(20, txs.length); i++) {
    const tx = txs[i];
    console.log(`${i+1}. Hash: ${tx.hash}`);
    console.log(`   From: ${tx.from}`);
    console.log(`   Block: ${tx.blockNumber}`);
    console.log(`   Method: ${tx.functionName || 'N/A'}`);
    console.log("");
  }
}

main().catch(console.error);
