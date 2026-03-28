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
  throw new Error('Usage: ts-node verify-daily-settlement-one.ts <0xAddress>');
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
  const stakingABI = [
    'function updateUserRewards(address user, uint256 rwAmount, uint256 usdtAmount, uint256 stakeId) external',
  ];
  const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, wallet);

  const calculator = new PreciseYieldCalculator();

  const now = Math.floor(Date.now() / 1000);
  const toTime = getToday8AM(now);
  const fromTime = toTime - 86400;

  const stakeId = BigInt(Date.now()) * 10000n + BigInt(Math.floor(Math.random() * 10000));

  for (const assetType of ['USDT', 'RWA'] as const) {
    console.log(`\n--- Verifying ${assetType} for ${userAddress} ---`);

    const { totalYield } = await calculator.calculateYield(userAddress, assetType, fromTime, toTime);
    if (totalYield === '0') {
      console.log('No yield => skip');
      continue;
    }

    const yieldWei = BigInt(totalYield);
    const yieldTokenStr = ethers.formatEther(yieldWei);
    console.log(`Computed totalYield=${totalYield} (wei), token=${yieldTokenStr}`);

    // 合约参数：根据 assetType 决定 rwAmount / usdtAmount
    let rwAmount: bigint;
    let usdtAmount: bigint;
    if (assetType === 'USDT') {
      rwAmount = yieldWei;
      usdtAmount = (yieldWei * 85n) / 100n; // 1 RWA = 0.85 USDT
    } else {
      rwAmount = yieldWei;
      usdtAmount = 0n;
    }

    // 1) 合约 staticCall：确认不会 revert
    try {
      await stakingContract.updateUserRewards.staticCall(userAddress, rwAmount, usdtAmount, stakeId);
      console.log(`staticCall OK (rwAmount=${rwAmount}, usdtAmount=${usdtAmount})`);
    } catch (err: any) {
      console.error('staticCall REVERT:', err?.reason || err?.message || err);
      continue;
    }

    // 2) DB 写入格式校验：yield_settlements.total_yield 是 DECIMAL(36,18)
    //    用 CAST 做一次安全校验，避免 Out of range。
    const totalYieldForDB = yieldTokenStr; // token amount with 18 decimals
    try {
      const rows = await query<Array<{ v: string }>>(
        'SELECT CAST(? AS DECIMAL(36,18)) as v',
        [totalYieldForDB]
      );
      console.log('DB CAST OK:', rows?.[0]?.v ?? rows);
    } catch (err: any) {
      console.error('DB CAST ERROR:', err?.message || err);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

