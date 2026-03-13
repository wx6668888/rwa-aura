const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
const txHash = '0xcac90c60cc02a55c5d176721fb1acaf006123add8dc10a531c8fc98c43e02599';

async function checkTransaction() {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    console.log('=== Transaction Receipt ===');
    console.log('Block:', receipt.blockNumber);
    console.log('Status:', receipt.status);
    console.log('Logs:', receipt.logs.length);
    
    receipt.logs.forEach((log, i) => {
      console.log(`\n--- Log ${i} ---`);
      console.log('Topics:', log.topics);
      console.log('Data:', log.data);
      
      // 尝试解析金额（假设在data中）
      if (log.data && log.data.length > 2) {
        try {
          const amount = ethers.getBigInt(log.data);
          console.log('Amount (wei):', amount.toString());
          console.log('Amount (RWA):', ethers.formatEther(amount));
        } catch (e) {
          // 可能有多个参数
          console.log('Data length:', log.data.length);
        }
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTransaction();
