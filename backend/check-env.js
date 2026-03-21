require('dotenv').config();

console.log('=== 环境变量检查 ===\n');
console.log('BSC_TESTNET_RPC_URL:', process.env.BSC_TESTNET_RPC_URL ? '✅ 已设置' : '❌ 未设置');
console.log('STAKING_CONTRACT_ADDRESS:', process.env.STAKING_CONTRACT_ADDRESS || '❌ 未设置');
console.log('BACKEND_PRIVATE_KEY:', process.env.BACKEND_PRIVATE_KEY ? '✅ 已设置 (长度: ' + process.env.BACKEND_PRIVATE_KEY.length + ')' : '❌ 未设置');
console.log('RWA_TOKEN_ADDRESS:', process.env.RWA_TOKEN_ADDRESS || '❌ 未设置');
console.log('USDT_TOKEN_ADDRESS:', process.env.USDT_TOKEN_ADDRESS || '❌ 未设置');
