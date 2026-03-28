import { ethers } from 'hardhat';

async function main() {
  // 须与 backend/src/config/bsc-mainnet-addresses.ts 及部署脚本当前 RWA/Staking 一致
  const rwaAddress =
    process.env.RWA_TOKEN_ADDRESS || process.env.RWA_TOKEN || '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6';
  const stakingAddress =
    process.env.STAKING_CONTRACT_ADDRESS ||
    process.env.STAKING_CONTRACT ||
    '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99';
  
  const rwa = await ethers.getContractAt('RWATokenWithPermit', rwaAddress);
  
  console.log('添加 StakingContract 到 RWA 白名单...');
  await rwa.addToWhitelist(stakingAddress);
  console.log('✅ 完成');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
