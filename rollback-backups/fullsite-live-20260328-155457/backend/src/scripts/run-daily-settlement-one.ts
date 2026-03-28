import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { query } from '../config/database.config';
import { PreciseYieldCalculator } from '../services/PreciseYieldCalculator';

dotenv.config();

function getToday8AM(now: number): number {
  const date = new Date(now * 1000);
  // 后端 daily settlement 以 UTC 0 点作为基准（日志里会显示 GMT+0800 -> 北京时间 8 点）
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function usage(): never {
  throw new Error('Usage: ts-node run-daily-settlement-one.ts <0xAddress>');
}

async function main() {
  const addressArg = process.argv[2] || process.env.VERIFY_ADDRESS;
  if (!addressArg) usage();

  const userAddress = addressArg.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(userAddress)) {
    throw new Error(`Invalid address: ${addressArg}`);
  }

  const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
  if (!rpcUrl) throw new Error('Missing BSC_RPC_URL or BSC_TESTNET_RPC_URL');
  const stakingContractAddress = process.env.STAKING_CONTRACT_ADDRESS;
  if (!stakingContractAddress) throw new Error('Missing STAKING_CONTRACT_ADDRESS');
  const backendPrivateKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendPrivateKey) throw new Error('Missing BACKEND_PRIVATE_KEY');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(backendPrivateKey, provider);

  // Minimal ABI needed for settlement
  const stakingABI = [
    'function updateUserRewards(address user, uint256 rwAmount, uint256 usdtAmount, uint256 stakeId) external',
    'function getUserRewards(address user) external view returns (uint256 rwaPending_, uint256 usdtRewards_)',
    'function rwaStakes(address user) external view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
  ];
  const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, wallet);

  const calculator = new PreciseYieldCalculator();

  const now = Math.floor(Date.now() / 1000);
  const toTime = getToday8AM(now);
  const fromTime = toTime - 86400;
  const stakeBase = BigInt(Date.now()) * 10000n;
  const stakeIdUSDT = stakeBase + 1000n;
  const stakeIdRWA = stakeBase + 2000n;

  console.log(`Settlement window: ${fromTime} -> ${toTime} (from ${new Date(fromTime * 1000).toISOString()} to ${new Date(toTime * 1000).toISOString()})`);
  console.log(`User: ${userAddress}`);

  for (const assetType of ['USDT', 'RWA'] as const) {
    // check duplicate for this settlement_time
    const existing = await query<Array<{ id: number }>>(
      `SELECT id FROM yield_settlements WHERE user_address = ? AND asset_type = ? AND settlement_time = ?`,
      [userAddress, assetType, toTime]
    );

    if (existing.length > 0) {
      console.log(`Skip ${assetType}: already inserted yield_settlements id=${existing[0].id}`);
      continue;
    }

    console.log(`\n--- Running settlement for ${assetType} ---`);
    const { totalYield, details } = await calculator.calculateYield(userAddress, assetType, fromTime, toTime);

    if (totalYield === '0') {
      console.log(`No yield for ${assetType}, skip`);
      continue;
    }

    const yieldWei = BigInt(totalYield);
    const yieldTokenStr = ethers.formatEther(yieldWei);
    console.log(`Computed totalYield=${totalYield} wei, token=${yieldTokenStr}`);

    if (assetType === 'USDT') {
      const rwAmount = yieldWei;
      const usdtAmount = (yieldWei * 85n) / 100n; // 1 RWA = 0.85 USDT

      const tx = await stakingContract.updateUserRewards(userAddress, rwAmount, usdtAmount, stakeIdUSDT);
      console.log(`tx sent (USDT): ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`tx mined (USDT): status=${receipt.status}`);

      // DB insert: total_yield = DECIMAL(36,18) expects "with decimals"
      const totalYieldForDB = yieldTokenStr;
      await query(
        `INSERT INTO yield_settlements (user_address, asset_type, settlement_time, from_time, to_time, total_yield, calculation_details, tx_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userAddress, assetType, toTime, fromTime, toTime, totalYieldForDB, JSON.stringify(details), tx.hash]
      );
      await query(
        `INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp)
         VALUES (?, 'daily_yield', 'RWA', ?, NOW())`,
        [userAddress, totalYield]
      );
    } else {
      const rwAmount = yieldWei;
      const tx = await stakingContract.updateUserRewards(userAddress, rwAmount, 0, stakeIdRWA);
      console.log(`tx sent (RWA): ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`tx mined (RWA): status=${receipt.status}`);

      const totalYieldForDB = yieldTokenStr;
      await query(
        `INSERT INTO yield_settlements (user_address, asset_type, settlement_time, from_time, to_time, total_yield, calculation_details, tx_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userAddress, assetType, toTime, fromTime, toTime, totalYieldForDB, JSON.stringify(details), tx.hash]
      );
      await query(
        `INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp)
         VALUES (?, 'daily_yield', 'RWA', ?, NOW())`,
        [userAddress, totalYield]
      );
    }
  }

  // Post-check: read contract states
  const [userRewards, rwaStakeInfo] = await Promise.all([
    stakingContract.getUserRewards(userAddress),
    stakingContract.rwaStakes(userAddress),
  ]);

  const rwaPending = userRewards.rwaPending_.toString();
  const usdtRewards = userRewards.usdtRewards_.toString();
  const rwaPendingStake = (rwaStakeInfo as any)[1]?.toString?.() ?? '0';

  console.log('\n=== Post-check from contract ===');
  console.log(`users.rwaPending (18dec): ${rwaPending}`);
  console.log(`users.usdtRewards (18dec): ${usdtRewards}`);
  console.log(`rwaStakes.rwaPending (18dec): ${rwaPendingStake}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

