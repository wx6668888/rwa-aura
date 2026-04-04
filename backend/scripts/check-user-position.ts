
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const STAKING_READ_ABI = [
  'function rwaFlexibleTotalStaked(address user) view returns (uint256)',
  'function usdtFlexibleTotalStaked(address user) view returns (uint256)',
  'function getRWALockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
  'function getUSDTLockedPrincipals(address user) view returns (uint256[] stakeIds, uint256[] amounts, uint256[] lockStartTimes, uint256[] lockEndTimes, bool[] canWithdraw, bool[] isWithdrawn)',
];

async function main() {
  const rpcUrl = process.env.SETTLEMENT_RPC_URL || process.env.BSC_RPC_URL;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(process.env.STAKING_CONTRACT_ADDRESS!, STAKING_READ_ABI, provider);
  const user = '0x6c302526C97BB2310FBf3FC2CeE5D81e70AEA7Dd';
  const blockTag = 'latest';

  console.log('Checking balances for', user, 'at', blockTag);

  try {
    const [rwaFlex, usdtFlex, rwaLocked, usdtLocked] = await Promise.all([
      contract.rwaFlexibleTotalStaked(user),
      contract.usdtFlexibleTotalStaked(user),
      contract.getRWALockedPrincipals(user),
      contract.getUSDTLockedPrincipals(user)
    ]);

    console.log('RWA Flexible:', rwaFlex.toString());
    console.log('USDT Flexible:', usdtFlex.toString());
    console.log('RWA Locked count:', rwaLocked[1].length);
    console.log('USDT Locked count:', usdtLocked[1].length);
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();
