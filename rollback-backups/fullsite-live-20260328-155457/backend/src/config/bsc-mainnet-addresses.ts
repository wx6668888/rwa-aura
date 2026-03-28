/**
 * BSC 主网已部署合约 — 单一事实来源（须与 frontend/lib/contracts/addresses.ts 及 backend/.env 一致）。
 * 各服务在 .env 缺省时使用此处 fallback，禁止再写其它测试网/历史地址。
 */
export const BSC_MAINNET_ADDRESSES = {
  stakingContract: '0x1E297055ffAA3BDD2a2eD96bD86A1B89d9245f99',
  rwaToken: '0x9EF16931f3628f48dE1A2FfCF6f7fdf34A5240A6',
  usdtToken: '0x55d398326f99059fF775485246999027B3197955',
  referralRewardPool: '0x80748B89042Ee30953E55856Cac473D1126720A6',
  teamDividendPool: '0x1616E70452c5A4adcF9faA93c5a4A691d0215924',
  lotteryContract: '0x82D475812BE018BF113c6815783DFa6d6658Ff88',
  usdtRwaSwap: '0x485a3bba1EB07680E418846ba412f1BB1E65F7a1',
  swapContract: '0xdE4296FD71c0634129C93155b9DB68eF647B326b',
  treasuryContract: '0x80c992C57c6439163E14050d01d1387706a27D37',
  stRwa: '0xE86fF3ddC9e1e39c5b3aee90a01C487882C9DAF1',
  pancakeRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
} as const;
