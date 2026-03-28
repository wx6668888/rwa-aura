const ethers = require('ethers');
(async () => {
  const p = new ethers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');
  const logs = await p.getLogs({
    address: '0xB4FD045003C402BE6ebaAECFD27105343CB7B3bE',
    fromBlock: 95632701,
    toBlock: 95632800
  });
  
  const stakeEventTopic = '0xa065435c124eadadc67eaba129651d6a45a0c6417334e01223ab3273dfd79bc0';
  
  for (const log of logs) {
    if (log.topics[0] === stakeEventTopic) {
      console.log('找到StakeEvent:');
      console.log('Topics数量:', log.topics.length);
      console.log('Topic[0]:', log.topics[0]);
      console.log('Topic[1] (user):', log.topics[1]);
      console.log('Topic[2] (referrer):', log.topics[2]);
      if (log.topics[3]) console.log('Topic[3]:', log.topics[3]);
      console.log('Data:', log.data);
      console.log('Data长度:', log.data.length);
      
      // 手动解析data (3个uint256: amount, stakeId, timestamp, lockPeriod)
      // 但data只有96字节 = 3个uint256，缺少1个
      const data = log.data.slice(2); // 移除0x
      console.log('\n手动解析:');
      console.log('amount:', '0x' + data.slice(0, 64));
      console.log('stakeId:', '0x' + data.slice(64, 128));
      console.log('timestamp:', '0x' + data.slice(128, 192));
      console.log('lockPeriod:', '0x' + data.slice(192, 256));
    }
  }
})();
