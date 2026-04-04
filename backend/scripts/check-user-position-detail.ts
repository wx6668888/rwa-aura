
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const STAKING_READ_ABI = [
  'function rwaFlexibleTotalStaked(address user) view returns (uint256)',
  'function getRWALockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
];

async function main() {
  const rpcUrl = process.env.SETTLEMENT_RPC_URL || process.env.BSC_RPC_URL;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(process.env.STAKING_CONTRACT_ADDRESS!, STAKING_READ_ABI, provider);
  const user = '0x77ee3f51F9e0C5C99DB8EF9451Eee1a382f7A340';
  const blockTag = 89318488;

  console.log('Checking balances for', user, 'at block', blockTag);

  try {
    const [rwaFlex, rwaLocked] = await Promise.all([
      contract.rwaFlexibleTotalStaked(user, { blockTag }),
      contract.getRWALockedPrincipals(user, { blockTag }),
    ]);

    console.log('--- RWA Flexible ---');
    console.log('Flexible Amount:', ethers.formatEther(rwaFlex), 'RWA');

    console.log('--- RWA Locked ---');
    const amounts = rwaLocked[1];
    const starts = rwaLocked[2];
    const ends = rwaLocked[3];
    const withdrawn = rwaLocked[5];

    for (let i = 0; i < amounts.length; i++) {
      if (withdrawn[i]) continue;
      const principal = amounts[i];
      const fullStake = principal * 2n;
      const durationSec = Number(ends[i] - starts[i]);
      const days = Math.round(durationSec / 86400);
      
      console.log(`Locked Position #${i}:`);
      console.log(`  Principal: ${ethers.formatEther(principal)} RWA`);
      console.log(`  Full Stake (Principal * 2): ${ethers.formatEther(fullStake)} RWA`);
      console.log(`  Lock Days: ${days} days`);
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();
