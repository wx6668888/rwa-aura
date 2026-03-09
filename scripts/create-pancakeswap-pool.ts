/**
 * 在 PancakeSwap V3 上创建 RWA/USDT 流动性池
 * 
 * 使用方法：
 * npx hardhat run scripts/create-pancakeswap-pool.ts --network bsc
 */

import { ethers } from 'hardhat';

// PancakeSwap V3 Factory 地址 (BSC 主网)
const PANCAKE_FACTORY_V3 = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';

// USDT 地址 (BSC 主网)
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// 费率: 2500 = 0.25%
const FEE_TIER = 2500;

// Factory ABI (简化版)
const FACTORY_ABI = [
  'function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)',
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
];

// Pool ABI (简化版)
const POOL_ABI = [
  'function initialize(uint160 sqrtPriceX96) external',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
];

/**
 * 计算 sqrtPriceX96
 * 
 * @param price - 价格 (token1/token0)
 * @returns sqrtPriceX96
 */
function calculateSqrtPriceX96(price: number): bigint {
  const sqrtPrice = Math.sqrt(price);
  const Q96 = 2n ** 96n;
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('='.repeat(60));
  console.log('创建 PancakeSwap V3 流动性池');
  console.log('='.repeat(60));
  console.log('部署账户:', deployer.address);
  console.log('账户余额:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'BNB');
  console.log('');

  // 获取 RWA Token 地址
  const RWA_ADDRESS = process.env.RWA_TOKEN_ADDRESS;
  
  if (!RWA_ADDRESS) {
    throw new Error('请设置环境变量 RWA_TOKEN_ADDRESS');
  }

  console.log('Token 地址:');
  console.log('  USDT:', USDT_ADDRESS);
  console.log('  RWA:', RWA_ADDRESS);
  console.log('  费率:', FEE_TIER / 10000, '%');
  console.log('');

  // 连接到 Factory 合约
  const factory = new ethers.Contract(PANCAKE_FACTORY_V3, FACTORY_ABI, deployer);

  // 检查池子是否已存在
  console.log('检查池子是否已存在...');
  const existingPool = await factory.getPool(USDT_ADDRESS, RWA_ADDRESS, FEE_TIER);
  
  if (existingPool !== ethers.ZeroAddress) {
    console.log('✅ 池子已存在:', existingPool);
    console.log('');
    
    // 检查池子是否已初始化
    const pool = new ethers.Contract(existingPool, POOL_ABI, deployer);
    try {
      const slot0 = await pool.slot0();
      console.log('池子状态:');
      console.log('  sqrtPriceX96:', slot0.sqrtPriceX96.toString());
      console.log('  tick:', slot0.tick.toString());
      console.log('  已初始化:', slot0.sqrtPriceX96 > 0n);
    } catch (err) {
      console.log('无法读取池子状态，可能未初始化');
    }
    
    console.log('');
    console.log('如果池子未初始化，请使用以下命令初始化:');
    console.log(`npx hardhat run scripts/initialize-pool.ts --network bsc`);
    return;
  }

  // 创建新池子
  console.log('创建新池子...');
  const tx = await factory.createPool(USDT_ADDRESS, RWA_ADDRESS, FEE_TIER);
  console.log('交易哈希:', tx.hash);
  
  const receipt = await tx.wait();
  console.log('✅ 交易已确认');
  console.log('');

  // 获取新创建的池子地址
  const poolAddress = await factory.getPool(USDT_ADDRESS, RWA_ADDRESS, FEE_TIER);
  console.log('✅ 池子创建成功!');
  console.log('池子地址:', poolAddress);
  console.log('');

  // 初始化池子价格
  // 假设 1 RWA = 0.85 USDT
  const initialPrice = 0.85;
  
  // 确定 token0 和 token1 的顺序
  const token0 = USDT_ADDRESS.toLowerCase() < RWA_ADDRESS.toLowerCase() ? USDT_ADDRESS : RWA_ADDRESS;
  const token1 = USDT_ADDRESS.toLowerCase() < RWA_ADDRESS.toLowerCase() ? RWA_ADDRESS : USDT_ADDRESS;
  
  // 计算价格（token1/token0）
  let price: number;
  if (token0 === USDT_ADDRESS) {
    // token0 = USDT, token1 = RWA
    // price = RWA/USDT = 1/0.85 = 1.176
    price = 1 / initialPrice;
  } else {
    // token0 = RWA, token1 = USDT
    // price = USDT/RWA = 0.85
    price = initialPrice;
  }
  
  const sqrtPriceX96 = calculateSqrtPriceX96(price);
  
  console.log('初始化池子价格...');
  console.log('  初始价格: 1 RWA =', initialPrice, 'USDT');
  console.log('  token0:', token0 === USDT_ADDRESS ? 'USDT' : 'RWA');
  console.log('  token1:', token1 === USDT_ADDRESS ? 'USDT' : 'RWA');
  console.log('  price (token1/token0):', price);
  console.log('  sqrtPriceX96:', sqrtPriceX96.toString());
  console.log('');

  const pool = new ethers.Contract(poolAddress, POOL_ABI, deployer);
  const initTx = await pool.initialize(sqrtPriceX96);
  console.log('交易哈希:', initTx.hash);
  
  await initTx.wait();
  console.log('✅ 池子初始化成功!');
  console.log('');

  // 验证初始化
  const slot0 = await pool.slot0();
  console.log('池子状态:');
  console.log('  sqrtPriceX96:', slot0.sqrtPriceX96.toString());
  console.log('  tick:', slot0.tick.toString());
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ 完成!');
  console.log('='.repeat(60));
  console.log('');
  console.log('下一步:');
  console.log('1. 更新前端配置:');
  console.log(`   frontend/lib/contracts/pancakeswap.ts`);
  console.log(`   export const RWA_USDT_POOL = '${poolAddress}';`);
  console.log('');
  console.log('2. 添加流动性:');
  console.log('   访问 https://pancakeswap.finance/liquidity');
  console.log('   或运行: npx hardhat run scripts/add-liquidity.ts --network bsc');
  console.log('');
  console.log('3. 测试兑换功能');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
