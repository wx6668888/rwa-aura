/**
 * 生成 StakingContract 的 pause / unpause / transferOwnership calldata（MetaMask 高级发送等）
 * 用法: cd backend && npx ts-node scripts/encode-staking-owner-calldata.ts
 */
import { Interface } from 'ethers';

const STAKING = (
  process.env.STAKING_CONTRACT_ADDRESS ||
  process.env.STAKING_CONTRACT ||
  '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99'
).trim();

const SAFE_NEW_OWNER = (
  process.env.SAFE_OWNER_ADDRESS || '0x6Edcc03b3cB13cEfCb518aF01cA5fF38E77fAAdC'
).trim();

const iface = new Interface([
  'function pause()',
  'function unpause()',
  'function transferOwnership(address newOwner)',
]);

function main() {
  console.log('StakingContract (to):', STAKING);
  console.log('Safe newOwner:', SAFE_NEW_OWNER);
  console.log('');
  console.log('pause()     data:', iface.encodeFunctionData('pause', []));
  console.log('unpause()   data:', iface.encodeFunctionData('unpause', []));
  console.log(
    'transferOwnership(safe) data:',
    iface.encodeFunctionData('transferOwnership', [SAFE_NEW_OWNER])
  );
}

main();
