// Lottery Contract ABI (Weekly=0, Monthly=1, RealTime=2, Annual=3)
export const LOTTERY_ABI = [
  "function buyTickets(uint256 count, uint8 poolType) external",
  "function claimPrize(uint256 ticketId) external",
  "function getUserTickets(address user) external view returns (uint256[])",
  "function getCurrentPoolInfo(uint8 poolType) external view returns (uint256 currentRound, uint256 prizePool, uint256 nextDrawTime, uint256 ticketsSold, uint256 ticketPrice)",
  "function getTicket(uint256 ticketId) external view returns (tuple(address owner, uint256 number, uint8 poolType, uint256 round, uint256 purchaseTime, bool isWinner, uint8 prizeLevel, uint256 prizeAmount, bool claimed))",
  "function getDraw(uint8 poolType, uint256 round) external view returns (tuple(uint256 winningNumber, uint256 drawTime, uint256 totalPrize, uint256[4] winnersCount, uint256[4] prizePerWinner, bool completed))",
  "function getPrizePool(uint8 poolType) external view returns (uint256)",
  "function WEEKLY_TICKET_PRICE() external view returns (uint256)",
  "function MONTHLY_TICKET_PRICE() external view returns (uint256)",
  "function REALTIME_TICKET_PRICE() external view returns (uint256)",
  "function ANNUAL_TICKET_PRICE() external view returns (uint256)",
  "function draw(uint8 poolType) external",
  "event TicketsPurchased(address indexed buyer, uint256[] ticketIds, uint256[] ticketNumbers, uint8 poolType, uint256 round, uint256 totalCost)",
  "event DrawCompleted(uint8 poolType, uint256 round, uint256 winningNumber, uint256 totalPrize, uint256 timestamp)",
  "event PrizeClaimed(address indexed winner, uint256 ticketId, uint8 prizeLevel, uint256 prizeAmount)"
] as const;

export type PoolType = 0 | 1 | 2 | 3; // 0=Weekly, 1=Monthly, 2=RealTime, 3=Annual
