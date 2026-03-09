/**
 * 检查 backend .env 配置是否满足运行与总留存（level-info 链上兜底）需求。
 * 运行：在 backend 目录执行 npx ts-node --transpile-only src/scripts/check-env.ts
 */
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

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

// Hardhat Local（chainId 31337/1337）- level-info 总留存链上兜底
console.log('\n【Hardhat Local - 总留存链上查询】');
const rpcLocal = process.env.RPC_URL || 'http://127.0.0.1:8545';
const contractLocal = process.env.STAKING_CONTRACT_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
console.log('  RPC_URL:', has('RPC_URL') ? process.env.RPC_URL : '未设置 → 使用默认 ' + rpcLocal);
console.log('  STAKING_CONTRACT_ADDRESS:', has('STAKING_CONTRACT_ADDRESS') ? process.env.STAKING_CONTRACT_ADDRESS : '未设置 → 使用默认 ' + contractLocal);
console.log('  → 当前本地链有效配置: RPC=' + rpcLocal + ', 合约=' + contractLocal);

// BSC（chainId 56）
console.log('\n【BSC 主网 - 可选】');
console.log('  BSC_RPC_URL:', has('BSC_RPC_URL') ? mask(process.env.BSC_RPC_URL!) : '未设置');
console.log('  STAKING_CONTRACT_ADDRESS_BSC:', has('STAKING_CONTRACT_ADDRESS_BSC') ? process.env.STAKING_CONTRACT_ADDRESS_BSC : '未设置 (回退用 STAKING_CONTRACT_ADDRESS)');

// BSC Testnet（chainId 97）
console.log('\n【BSC 测试网 - 可选】');
console.log('  BSC_TESTNET_RPC_URL:', has('BSC_TESTNET_RPC_URL') ? '已设置' : '未设置');
console.log('  STAKING_CONTRACT_ADDRESS_TESTNET:', has('STAKING_CONTRACT_ADDRESS_TESTNET') ? process.env.STAKING_CONTRACT_ADDRESS_TESTNET : '未设置');

// 与前端默认对比（frontend/lib/contracts/addresses.ts 本地默认）
const FRONTEND_LOCAL_STAKING_DEFAULT = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const backendLocalContract = contractLocal.toLowerCase();
const frontendDefault = FRONTEND_LOCAL_STAKING_DEFAULT.toLowerCase();
const match = backendLocalContract === frontendDefault;

console.log('\n【与前端一致性】');
console.log('  前端本地默认质押合约:', FRONTEND_LOCAL_STAKING_DEFAULT);
console.log('  当前 backend 本地链合约:', contractLocal);
if (!match) {
  console.log('  ⚠ 不一致：请在前端 .env.local 设置 NEXT_PUBLIC_STAKING_CONTRACT_LOCAL=' + contractLocal);
  console.log('    或把 backend .env 的 STAKING_CONTRACT_ADDRESS 改为 ' + FRONTEND_LOCAL_STAKING_DEFAULT + ' 与前端默认一致');
} else {
  console.log('  ✓ 与前端默认一致');
}

console.log('\n【结论】');
console.log('  数据库: 可连接 (需 MySQL 已启动)');
console.log('  Hardhat Local: RPC 使用 ' + rpcLocal + '，合约使用 ' + contractLocal);
console.log('  前端需传 chainId=31337，且质押合约地址需与后端一致，总留存链上查询才会正确');
console.log('');
