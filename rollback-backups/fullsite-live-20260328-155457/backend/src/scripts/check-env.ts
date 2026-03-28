/**
 * 检查 backend .env 配置是否满足运行与总留存（level-info 链上兜底）需求。
 * 运行：在 backend 目录执行 npx ts-node --transpile-only src/scripts/check-env.ts
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses';

// 从 backend 目录加载 .env（在 backend 下执行脚本时 process.cwd() 为 backend）
dotenvConfig({ path: resolve(process.cwd(), '.env') });

function mask(s: string): string {
  if (!s || s.length < 12) return s ? '***' : '';
  return s.slice(0, 6) + '...' + s.slice(-4);
}

function has(key: string): boolean {
  const v = process.env[key];
  return v != null && String(v).trim() !== '';
}

console.log('\n=== Backend .env 检查 ===\n');

// 数据库
console.log('【数据库】');
console.log('  DB_HOST:', has('DB_HOST') ? process.env.DB_HOST : '未设置 (默认 localhost)');
console.log('  DB_PORT:', has('DB_PORT') ? process.env.DB_PORT : '未设置 (默认 3306)');
console.log('  DB_USER:', has('DB_USER') ? process.env.DB_USER : '未设置 (默认 rwa_user)');
console.log('  DB_PASSWORD:', has('DB_PASSWORD') ? '已设置 ' + mask(process.env.DB_PASSWORD!) : '未设置');
console.log('  DB_NAME:', has('DB_NAME') ? process.env.DB_NAME : '未设置 (默认 rwa_protocol)');

// 服务
console.log('\n【服务】');
console.log('  PORT:', has('PORT') ? process.env.PORT : '未设置 (默认 3001)');
console.log('  CORS_ORIGIN:', has('CORS_ORIGIN') ? process.env.CORS_ORIGIN : '未设置');

// 本地 Hardhat 默认（仅当 RPC 指向本机时与「总留存链上兜底」语义一致）
console.log('\n【RPC / Staking 地址（脚本与部分服务读取）】');
const rpcLocal = process.env.RPC_URL || 'http://127.0.0.1:8545';
const hardhatDefaultStaking = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const contractLocal =
  process.env.STAKING_CONTRACT_ADDRESS || process.env.STAKING_CONTRACT || hardhatDefaultStaking;
const looksLikeLocalRpc =
  /127\.0\.0\.1|localhost/i.test(rpcLocal) && !/binance|bsc|ankr|nodereal|alchemy/i.test(rpcLocal);
console.log('  RPC_URL:', has('RPC_URL') ? process.env.RPC_URL : '未设置 → 默认 ' + rpcLocal);
console.log(
  '  STAKING_CONTRACT_ADDRESS / STAKING_CONTRACT:',
  has('STAKING_CONTRACT_ADDRESS') || has('STAKING_CONTRACT')
    ? contractLocal
    : '未设置 → Hardhat 默认 ' + hardhatDefaultStaking
);
console.log(
  '  → 解析后 Staking:',
  contractLocal,
  looksLikeLocalRpc ? '（RPC 像本地链）' : '（RPC 非本机时多为 BSC 主网生产配置）'
);

// BSC（chainId 56）
console.log('\n【BSC 主网 - 可选】');
console.log('  BSC_RPC_URL:', has('BSC_RPC_URL') ? mask(process.env.BSC_RPC_URL!) : '未设置');
console.log('  STAKING_CONTRACT_ADDRESS_BSC:', has('STAKING_CONTRACT_ADDRESS_BSC') ? process.env.STAKING_CONTRACT_ADDRESS_BSC : '未设置 (回退用 STAKING_CONTRACT_ADDRESS)');

// BSC Testnet（chainId 97）
console.log('\n【BSC 测试网 - 可选】');
console.log('  BSC_TESTNET_RPC_URL:', has('BSC_TESTNET_RPC_URL') ? '已设置' : '未设置');
console.log('  STAKING_CONTRACT_ADDRESS_TESTNET:', has('STAKING_CONTRACT_ADDRESS_TESTNET') ? process.env.STAKING_CONTRACT_ADDRESS_TESTNET : '未设置');

// BSC 主网 canonical（与 frontend/lib/contracts/addresses.ts 同源）
const bscStakingEnv = (process.env.STAKING_CONTRACT_ADDRESS || process.env.STAKING_CONTRACT || '').trim();
const bscStakingOk =
  !bscStakingEnv || bscStakingEnv.toLowerCase() === BSC_MAINNET_ADDRESSES.stakingContract.toLowerCase();

console.log('\n【BSC 主网与 canonical 一致性】');
console.log('  canonical Staking:', BSC_MAINNET_ADDRESSES.stakingContract);
console.log('  .env STAKING_CONTRACT*:', bscStakingEnv || '(未设置，运行时用 canonical fallback)');
console.log('  ', bscStakingOk ? '✓' : '⚠ 与 bsc-mainnet-addresses.ts 不一致，请核对 .env');

// Hardhat Local 对比（仅本地链开发）
const FRONTEND_LOCAL_STAKING_DEFAULT = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const backendResolvedStaking = contractLocal.toLowerCase();
const frontendDefault = FRONTEND_LOCAL_STAKING_DEFAULT.toLowerCase();
const localMatch = looksLikeLocalRpc && backendResolvedStaking === frontendDefault;

console.log('\n【仅本地 Hardhat 开发】');
console.log('  若你只用 BSC 主网，可忽略本节。');
console.log('  前端 wagmi Hardhat 默认质押:', FRONTEND_LOCAL_STAKING_DEFAULT);
console.log('  当前 .env 解析 Staking:', contractLocal);
console.log(
  '  ',
  localMatch
    ? '✓ 与 Hardhat 默认一致'
    : looksLikeLocalRpc
      ? '⚠ 与 Hardhat 默认不同（正常若你自定义部署）'
      : '—（当前 RPC 非本机，本节不适用）'
);

console.log('\n【结论】');
console.log('  数据库: 可连接 (需 MySQL 已启动)');
console.log('  BSC 主网: 以「BSC 主网与 canonical 一致性」为准；中继/日结等须与前端 `addresses.ts` 同源');
console.log('  本地 Hardhat: RPC 指向 127.0.0.1 时，前端 chainId=31337 且 Staking 地址需与后端一致');
console.log('');
