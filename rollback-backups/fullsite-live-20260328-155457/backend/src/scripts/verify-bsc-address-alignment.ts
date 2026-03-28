/**
 * 校验 backend/.env 中 BSC 主网合约地址是否与 bsc-mainnet-addresses.ts 一致。
 * 用法：cd backend && npx ts-node --transpile-only src/scripts/verify-bsc-address-alignment.ts
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses';

dotenvConfig({ path: resolve(process.cwd(), '.env'), override: true });

function norm(s: string | undefined): string {
  return (s || '').trim().replace(/\r/g, '').toLowerCase();
}

function envFirst(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== '') return String(v).trim().replace(/\r/g, '');
  }
  return '';
}

const checks: { label: string; envKeys: string[]; canonical: string }[] = [
  { label: 'stakingContract', envKeys: ['STAKING_CONTRACT_ADDRESS', 'STAKING_CONTRACT'], canonical: BSC_MAINNET_ADDRESSES.stakingContract },
  { label: 'rwaToken', envKeys: ['RWA_TOKEN_ADDRESS', 'RWA_TOKEN'], canonical: BSC_MAINNET_ADDRESSES.rwaToken },
  { label: 'usdtToken', envKeys: ['USDT_TOKEN_ADDRESS', 'USDT_TOKEN'], canonical: BSC_MAINNET_ADDRESSES.usdtToken },
  { label: 'referralRewardPool', envKeys: ['REFERRAL_REWARD_POOL_ADDRESS', 'REFERRAL_REWARD_POOL'], canonical: BSC_MAINNET_ADDRESSES.referralRewardPool },
  { label: 'teamDividendPool', envKeys: ['TEAM_DIVIDEND_POOL_ADDRESS'], canonical: BSC_MAINNET_ADDRESSES.teamDividendPool },
  { label: 'lotteryContract', envKeys: ['LOTTERY_CONTRACT'], canonical: BSC_MAINNET_ADDRESSES.lotteryContract },
  { label: 'usdtRwaSwap', envKeys: ['USDT_RWA_SWAP'], canonical: BSC_MAINNET_ADDRESSES.usdtRwaSwap },
  { label: 'swapContract', envKeys: ['SWAP_CONTRACT_ADDRESS'], canonical: BSC_MAINNET_ADDRESSES.swapContract },
  { label: 'treasuryContract', envKeys: ['TREASURY_CONTRACT_ADDRESS'], canonical: BSC_MAINNET_ADDRESSES.treasuryContract },
  { label: 'stRwa', envKeys: ['STRWA_ADDRESS', 'ST_RWA_ADDRESS'], canonical: BSC_MAINNET_ADDRESSES.stRwa },
  { label: 'pancakeRouter', envKeys: ['PANCAKE_ROUTER_ADDRESS'], canonical: BSC_MAINNET_ADDRESSES.pancakeRouter },
];

let failed = false;
console.log('\n=== BSC 主网地址对齐（.env vs bsc-mainnet-addresses.ts）===\n');

for (const { label, envKeys, canonical } of checks) {
  const fromEnv = envFirst(...envKeys);
  const e = norm(fromEnv);
  const c = norm(canonical);
  if (!fromEnv) {
    console.log(`  ⚠ ${label}: .env 未设置 [${envKeys.join(', ')}] → 运行时将使用 canonical`);
    continue;
  }
  if (e !== c) {
    failed = true;
    console.log(`  ✗ MISMATCH ${label}`);
    console.log(`      .env:     ${fromEnv}`);
    console.log(`      canonical ${canonical}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

console.log('');
process.exit(failed ? 1 : 0);
