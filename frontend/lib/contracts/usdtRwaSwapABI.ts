export const usdtRwaSwapABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_usdtToken", "type": "address" },
      { "internalType": "address", "name": "_rwaToken", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "usdtAmount", "type": "uint256" }
    ],
    "name": "swapUSDTToRWA",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "rwaAmount", "type": "uint256" }
    ],
    "name": "swapRWAToUSDT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "usdtAmount", "type": "uint256" }
    ],
    "name": "getQuoteUSDTToRWA",
    "outputs": [
      { "internalType": "uint256", "name": "rwaAmount", "type": "uint256" }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "rwaAmount", "type": "uint256" }
    ],
    "name": "getQuoteRWAToUSDT",
    "outputs": [
      { "internalType": "uint256", "name": "usdtAmount", "type": "uint256" }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLiquidity",
    "outputs": [
      { "internalType": "uint256", "name": "usdtBalance", "type": "uint256" },
      { "internalType": "uint256", "name": "rwaBalance", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "swapEnabled",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "usdtAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "rwaAmount", "type": "uint256" }
    ],
    "name": "SwapUSDTToRWA",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "rwaAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "usdtAmount", "type": "uint256" }
    ],
    "name": "SwapRWAToUSDT",
    "type": "event"
  }
] as const;
