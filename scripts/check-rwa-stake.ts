import { ethers } from 'hardhat';

async function main() {
  const STAKING_ADDRESS = '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99';
  const USER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  const provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545');
  const stakingAbi = require('../artifacts/contracts/StakingContract.sol/StakingContract.json').abi;
  const staking = new ethers.Contract(STAKING_ADDRESS, stakingAbi, provider);
  
  console.log('查询 RWA 质押信息...\n');
  
  const rwaInfo = await staking.rwaStakes(USER_ADDRESS);
  console.log('totalStakedRWA:', ethers.formatUnits(rwaInfo.totalStakedRWA, 18), 'RWA');
  console.log('firstStakeTime:', rwaInfo.firstStakeTime.toString());
  console.log('rwaPending:', ethers.formatUnits(rwaInfo.rwaPending, 18), 'RWA');
  console.log('referrer:', rwaInfo.referrer);
  
  if (rwaInfo.totalStakedRWA > 0n) {
    console.log('\n✅ RWA 质押成功！');
  } else {
    console.log('\n❌ RWA 质押为 0，交易可能失败或未上链');
  }
}

main().catch(console.error);
