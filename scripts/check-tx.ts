import { ethers } from 'hardhat';

async function main() {
  const TX_HASH = '0x5e4c8c0e2e9e0b8f9c8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e'; // 替换为实际的交易哈希
  
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
  
  console.log('查询交易详情...\n');
  const tx = await provider.getTransaction(TX_HASH);
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  
  console.log('交易状态:', receipt?.status === 1 ? '成功' : '失败');
  console.log('调用的合约:', tx?.to);
  console.log('Gas 使用:', receipt?.gasUsed.toString());
  
  // 解析事件
  if (receipt) {
    console.log('\n事件日志:');
    receipt.logs.forEach((log, i) => {
      console.log(`  Log ${i}:`, log.topics[0]);
    });
  }
}

main().catch(console.error);
