const ethers = require('ethers');
(async () => {
  const provider = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const address = '0xCD5b97505499B1575e481446384430bb159851b6';
  
  // 获取最新区块
  const latestBlock = await provider.getBlockNumber();
  console.log(`最新区块: ${latestBlock}`);
  
  // 获取最近10笔交易
  const history = await provider.getHistory(address);
  console.log(`\n最近交易记录 (共${history.length}笔):\n`);
  
  const recent = history.slice(-10).reverse();
  for (const tx of recent) {
    const receipt = await provider.getTransactionReceipt(tx.hash);
    const block = await provider.getBlock(tx.blockNumber);
    const time = new Date(block.timestamp * 1000).toLocaleString('zh-CN');
    console.log(`区块: ${tx.blockNumber} | 时间: ${time}`);
    console.log(`哈希: ${tx.hash}`);
    console.log(`状态: ${receipt.status === 1 ? '✅成功' : '❌失败'}`);
    console.log(`---`);
  }
})();
