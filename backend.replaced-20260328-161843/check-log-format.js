const ethers = require('ethers');
(async () => {
  const p = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const logs = await p.getLogs({
    address: '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE',
    fromBlock: 95632701,
    toBlock: 95632800
  });
  
  console.log(`找到 ${logs.length} 个日志\n`);
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    console.log(`Log ${i}:`);
    console.log('区块:', log.blockNumber);
    console.log('交易:', log.transactionHash);
    console.log('Topics数量:', log.topics.length);
    console.log('Topic[0]:', log.topics[0]);
    console.log('Data长度:', log.data.length);
    console.log('---\n');
  }
})();
