import { ethers } from 'hardhat';

async function main() {
  const STAKING_ADDRESS = '0x6140e7fAfcC48a6635d981202A7A9931C672772B';
  const USER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
  const currentBlock = await provider.getBlockNumber();
  
  console.log('查询最近 1000 个区块的 RWA 质押事件...\n');
  
  const logs = await provider.getLogs({
    address: STAKING_ADDRESS,
    topics: [
      ethers.id('RWAStakeEvent(address,uint256,address,uint256,uint256,uint256)'),
      ethers.zeroPadValue(USER_ADDRESS, 32),
    ],
    fromBlock: Number(currentBlock) - 1000,
    toBlock: 'latest',
  });
  
  console.log('找到', logs.length, '条 RWA 质押事件');
  
  logs.forEach((log, i) => {
    console.log(`\n事件 ${i + 1}:`);
    console.log('  区块:', log.blockNumber);
    console.log('  交易:', log.transactionHash);
  });
}

main().catch(console.error);
