export const teamDividendPoolABI = [
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'dividendBalances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAvailableBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPoolStatus',
    outputs: [
      { internalType: 'uint256', name: 'totalBalance', type: 'uint256' },
      { internalType: 'uint256', name: 'settledUnwithdrawn', type: 'uint256' },
      { internalType: 'uint256', name: 'reservedGas', type: 'uint256' },
      { internalType: 'uint256', name: 'availableBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'withdrawDividend',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
