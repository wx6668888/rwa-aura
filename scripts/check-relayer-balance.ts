import { ethers } from 'hardhat';

async function main() {
  const relayerAddress = '0xa941F4806E0e3Ea7577aEC6c015d6E9D91584638';
  
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
  const balance = await provider.getBalance(relayerAddress);
  
  console.log('Relayer 地址:', relayerAddress);
  console.log('BNB 余额:', ethers.formatEther(balance), 'BNB');
  
  if (balance === 0n) {
    console.log('\n⚠️ Relayer 没有 BNB！需要给它转一些测试币。');
  }
}

main().catch(console.error);
