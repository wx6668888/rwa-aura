// Lottery Contract ABI (Weekly=0, Monthly=1, RealTime=2, Annual=3)
// 标准JSON ABI格式
export const LOTTERY_ABI = [
  {
    "type": "function",
    "name": "buyTickets",
    "inputs": [
      {"name": "count", "type": "uint256"},
      {"name": "poolType", "type": "uint8"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimPrize",
    "inputs": [{"name": "ticketId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getUserTickets",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCurrentPoolInfo",
    "inputs": [{"name": "poolType", "type": "uint8"}],
    "outputs": [
      {"name": "currentRound", "type": "uint256"},
      {"name": "prizePool", "type": "uint256"},
      {"name": "nextDrawTime", "type": "uint256"},
      {"name": "ticketsSold", "type": "uint256"},
      {"name": "ticketPrice", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTicket",
    "inputs": [{"name": "ticketId", "type": "uint256"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {"name": "owner", "type": "address"},
          {"name": "number", "type": "uint256"},
          {"name": "poolType", "type": "uint8"},
          {"name": "round", "type": "uint256"},
          {"name": "purchaseTime", "type": "uint256"},
          {"name": "isWinner", "type": "bool"},
          {"name": "prizeLevel", "type": "uint8"},
          {"name": "prizeAmount", "type": "uint256"},
          {"name": "claimed", "type": "bool"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDraw",
    "inputs": [
      {"name": "poolType", "type": "uint8"},
      {"name": "round", "type": "uint256"}
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {"name": "winningNumber", "type": "uint256"},
          {"name": "drawTime", "type": "uint256"},
          {"name": "totalPrize", "type": "uint256"},
          {"name": "winnersCount", "type": "uint256[4]"},
          {"name": "prizePerWinner", "type": "uint256[4]"},
          {"name": "completed", "type": "bool"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "TicketsPurchased",
    "inputs": [
      {"name": "buyer", "type": "address", "indexed": true},
      {"name": "ticketIds", "type": "uint256[]", "indexed": false},
      {"name": "ticketNumbers", "type": "uint256[]", "indexed": false},
      {"name": "poolType", "type": "uint8", "indexed": false},
      {"name": "round", "type": "uint256", "indexed": false},
      {"name": "totalCost", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "DrawCompleted",
    "inputs": [
      {"name": "poolType", "type": "uint8", "indexed": false},
      {"name": "round", "type": "uint256", "indexed": false},
      {"name": "winningNumber", "type": "uint256", "indexed": false},
      {"name": "totalPrize", "type": "uint256", "indexed": false},
      {"name": "timestamp", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "PrizeClaimed",
    "inputs": [
      {"name": "winner", "type": "address", "indexed": true},
      {"name": "ticketId", "type": "uint256", "indexed": false},
      {"name": "prizeLevel", "type": "uint8", "indexed": false},
      {"name": "prizeAmount", "type": "uint256", "indexed": false}
    ]
  }
] as const;

export type PoolType = 0 | 1 | 2 | 3; // 0=Weekly, 1=Monthly, 2=RealTime, 3=Annual
