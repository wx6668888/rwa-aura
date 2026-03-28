import type { MigrationBundleArgs } from './legacyUserBundle';

/** MigrationBundleArgs → migrationImportUserBundle 所需的 struct 形态（ethers v6） */
export function migrationArgsToContractTuples(args: MigrationBundleArgs) {
  const uInfo = {
    totalStaked: args.uInfo[0],
    rwaPending: args.uInfo[1],
    usdtRewards: args.uInfo[2],
    lastWithdrawTime: args.uInfo[3],
    referrer: args.uInfo[4],
    firstStakeTime: args.uInfo[5],
    nodeLevel: args.uInfo[6],
    isActive: args.uInfo[7],
  };
  const rInfo = {
    totalStakedRWA: args.rInfo[0],
    rwaPending: args.rInfo[1],
    lastWithdrawTime: args.rInfo[2],
    referrer: args.rInfo[3],
    firstStakeTime: args.rInfo[4],
    nodeLevel: args.rInfo[5],
    isActive: args.rInfo[6],
  };
  const mapLock = (x: [bigint, bigint, bigint, bigint, bigint, boolean, bigint]) => ({
    stakeId: x[0],
    totalAmount: x[1],
    principalAmount: x[2],
    lockStartTime: x[3],
    lockEndTime: x[4],
    isWithdrawn: x[5],
    lockPeriod: x[6],
  });
  const hist = args.hist.map(([amount, timestamp]) => ({ amount, timestamp }));
  return {
    user: args.user,
    uInfo,
    rInfo,
    usdtLocks: args.usdtLocks.map(mapLock),
    rwaLocks: args.rwaLocks.map(mapLock),
    usdtFlexPrincipal_: args.usdtFlexPrincipal_,
    usdtFlexTotal_: args.usdtFlexTotal_,
    rwaFlexPrincipal_: args.rwaFlexPrincipal_,
    rwaFlexTotal_: args.rwaFlexTotal_,
    hist,
    globalDeltaTotalStaked: args.globalDeltaTotalStaked,
    globalDeltaTotalStakedRWA: args.globalDeltaTotalStakedRWA,
  };
}
