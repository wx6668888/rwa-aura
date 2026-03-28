/**
 * 新 StakingContract 迁移相关最小 ABI（供纯 ethers 发送交易）
 */
export const STAKING_MIGRATION_ABI = [
  'function setMigrationEnabled(bool enabled) external',
  'function migrationSetStakesCounter(uint256 minNext) external',
  'function migrationImportUserBundle(address user, tuple(uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive) uInfo, tuple(uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive) rInfo, tuple(uint256 stakeId, uint256 totalAmount, uint256 principalAmount, uint256 lockStartTime, uint256 lockEndTime, bool isWithdrawn, uint256 lockPeriod)[] usdtLocks, tuple(uint256 stakeId, uint256 totalAmount, uint256 principalAmount, uint256 lockStartTime, uint256 lockEndTime, bool isWithdrawn, uint256 lockPeriod)[] rwaLocks, uint256 usdtFlexPrincipal_, uint256 usdtFlexTotal_, uint256 rwaFlexPrincipal_, uint256 rwaFlexTotal_, tuple(uint256 amount, uint256 timestamp)[] hist, uint256 globalDeltaTotalStaked, uint256 globalDeltaTotalStakedRWA) external',
  'function stakesCounter() view returns (uint256)',
  'function migrationEnabled() view returns (bool)',
  'function migrationSeen(address user) view returns (bool)',
] as const;
