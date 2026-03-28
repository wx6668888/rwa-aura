import { ethers } from 'hardhat';

async function main() {
  const STAKING_ADDRESS = '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99';
  const USER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
  const stakingAbi = require('../artifacts/contracts/StakingContract.sol/StakingContract.json').abi;
  const staking = new ethers.Contract(STAKING_ADDRESS, stakingAbi, provider);
  
  console.log('查询用户质押信息...\n');
  
  // USDT 质押
  const userInfo = await staking.users(USER_ADDRESS);
  console.log('USDT 质押:');
  console.log('  totalStaked:', ethers.formatUnits(userInfo.totalStaked, 18));
  console.log('  firstStakeTime:', new Date(Number(userInfo.firstStakeTime) * 1000).toLocaleString());
  
  // RWA 质押
  const rwaInfo = await staking.rwaStakes(USER_ADDRESS);
  console.log('\nRWA 质押:');
  console.log('  totalStakedRWA:', ethers.formatUnits(rwaInfo.totalStakedRWA, 18));
  console.log('  firstStakeTime:', new Date(Number(rwaInfo.firstStakeTime) * 1000).toLocaleString());
}

main().catch(console.error);
