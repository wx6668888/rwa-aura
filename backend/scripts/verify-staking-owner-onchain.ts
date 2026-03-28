/**
 * 链上读取 StakingContract: owner()、paused()、backendAddress()
 * 用法: cd backend && npx ts-node scripts/verify-staking-owner-onchain.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import { Contract, JsonRpcProvider } from 'ethers';

dotenv.config({ path: path.join(__dirname, '../.env') });

const STAKING = (
  process.env.STAKING_CONTRACT_ADDRESS ||
  process.env.STAKING_CONTRACT ||
  '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99'
).trim();

const RPC =
  process.env.BSC_RPC_URL ||
  process.env.BSC_RPC_URLS?.split(',')[0]?.trim() ||
  'https://bsc.publicnode.com';

const abi = [
  'function owner() view returns (address)',
  'function paused() view returns (bool)',
  'function backendAddress() view returns (address)',
];

async function main() {
  const provider = new JsonRpcProvider(RPC);
  const c = new Contract(STAKING, abi, provider);
  const [owner, paused, backend] = await Promise.all([
    c.owner(),
    c.paused(),
    c.backendAddress(),
  ]);
  console.log('RPC:', RPC);
  console.log('StakingContract:', STAKING);
  console.log('owner():         ', owner);
  console.log('paused():        ', paused);
  console.log('backendAddress():', backend);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
