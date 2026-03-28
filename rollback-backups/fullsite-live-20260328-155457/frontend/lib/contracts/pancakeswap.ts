/**
 * PancakeSwap V3 配置
 * BSC 主网合约地址
 */

export const PANCAKESWAP_V3_ADDRESSES = {
  // Router 合约 - 执行兑换
  router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
  
  // Quoter 合约 - 获取报价
  quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
  
  // Factory 合约 - 创建池子
  factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
  
  // NFT Position Manager - 管理流动性
  nftPositionManager: '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364',
} as const;

/**
 * 费率等级 (basis points)
 * 100 = 0.01%
 * 500 = 0.05%
 * 2500 = 0.25%
 * 10000 = 1%
 */
export const FEE_TIERS = {
  LOWEST: 100,    // 0.01% - 稳定币对
  LOW: 500,       // 0.05% - 相关资产
  MEDIUM: 2500,   // 0.25% - 标准对
  HIGH: 10000,    // 1% - 异类资产
} as const;

/**
 * 推荐使用的费率
 * RWA/USDT 使用 0.25% 费率
 */
export const RECOMMENDED_FEE = FEE_TIERS.MEDIUM; // 2500 = 0.25%

/**
 * RWA/USDT 流动性池地址
 * TODO: 创建池子后更新此地址
 */
export const RWA_USDT_POOL = '0x0000000000000000000000000000000000000000'; // 待更新

/**
 * Quoter V2 ABI (简化版 - 只包含需要的函数)
 */
export const QUOTER_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'fee', type: 'uint24' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' }
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Router V3 ABI (简化版 - 只包含需要的函数)
 */
export const ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

/**
 * ERC20 ABI (用于授权)
 */
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * 最大授权额度
 */
export const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

/**
 * 默认滑点容忍度 (%)
 */
export const DEFAULT_SLIPPAGE = 0.5; // 0.5%

/**
 * 默认交易截止时间 (分钟)
 */
export const DEFAULT_DEADLINE = 20; // 20 分钟
