import { query } from '../config/database.config';
import logger from '../utils/logger';
import BigNumber from 'bignumber.js';
import { normalizeSettlementUserAddress } from '../utils/settlementAddress';

interface BalanceSnapshot {
  timestamp: number;
  balance_type: string;
  amount: string;
  lock_end_time: number | null;
  event_type: string;
}

interface BalanceState {
  flexible: BigNumber;
  locked_30: BigNumber;
  locked_90: BigNumber;
  locked_180: BigNumber;
  locked_365: BigNumber;
}

export class PreciseYieldCalculator {
  private readonly BASE_YIELD_RATE = 0.008;
  private readonly LOCK_BONUS = { 0: 0, 30: 0.3, 90: 0.6, 180: 1.0, 365: 1.5 };

  async calculateYield(userAddress: string, assetType: 'USDT' | 'RWA', fromTime: number, toTime: number): Promise<{ totalYield: string; details: any[] }> {
    const addr = normalizeSettlementUserAddress(userAddress);
    logger.info(`Calculating yield for ${addr} (${assetType}) from ${fromTime} to ${toTime}`);

    const allSnapshots = await this.getAllSnapshots(addr, assetType, toTime);
    if (allSnapshots.length === 0) return { totalYield: '0', details: [] };

    // 计算fromTime之前的余额（不包括fromTime时刻的快照）
    const snapshotsBeforeFrom = allSnapshots.filter(s => s.timestamp < fromTime);
    const initialBalance = this.calculateBalanceFromSnapshots(snapshotsBeforeFrom);
    
    // 获取fromTime到toTime之间的快照（包括fromTime）
    const snapshots = allSnapshots.filter(s => s.timestamp >= fromTime && s.timestamp <= toTime);
    
    const details: any[] = [];
    let totalYield = new BigNumber(0);
    let currentBalance = this.deepCopyBalance(initialBalance);
    let lastTime = fromTime;

    for (const snapshot of snapshots) {
      if (snapshot.timestamp > lastTime) {
        const segmentYield = this.calculateSegmentYield(currentBalance, lastTime, snapshot.timestamp, assetType);
        totalYield = totalYield.plus(segmentYield.yield);
        details.push(segmentYield);
      }
      this.updateBalance(currentBalance, snapshot);
      lastTime = snapshot.timestamp;
    }

    if (lastTime < toTime) {
      const finalYield = this.calculateSegmentYield(currentBalance, lastTime, toTime, assetType);
      totalYield = totalYield.plus(finalYield.yield);
      details.push(finalYield);
    }

    return { totalYield: totalYield.toFixed(0), details };
  }

  private async getAllSnapshots(normalizedUserAddress: string, assetType: 'USDT' | 'RWA', toTime: number): Promise<BalanceSnapshot[]> {
    return await query<BalanceSnapshot[]>(
      `SELECT timestamp, balance_type, amount, lock_end_time, event_type FROM balance_snapshots
       WHERE LOWER(TRIM(user_address)) = ? AND asset_type = ? AND timestamp <= ?
       ORDER BY timestamp ASC, id ASC`,
      [normalizedUserAddress, assetType, toTime]
    );
  }

  private calculateBalanceAtTime(snapshots: BalanceSnapshot[], time: number): BalanceState {
    const balance: BalanceState = {
      flexible: new BigNumber(0),
      locked_30: new BigNumber(0),
      locked_90: new BigNumber(0),
      locked_180: new BigNumber(0),
      locked_365: new BigNumber(0)
    };

    for (const snapshot of snapshots) {
      if (snapshot.timestamp > time) break;
      this.updateBalance(balance, snapshot);
    }

    return balance;
  }

  private calculateBalanceFromSnapshots(snapshots: BalanceSnapshot[]): BalanceState {
    const balance: BalanceState = {
      flexible: new BigNumber(0),
      locked_30: new BigNumber(0),
      locked_90: new BigNumber(0),
      locked_180: new BigNumber(0),
      locked_365: new BigNumber(0)
    };

    for (const snapshot of snapshots) {
      this.updateBalance(balance, snapshot);
    }

    return balance;
  }

  private updateBalance(balance: BalanceState, snapshot: BalanceSnapshot): void {
    const amount = new BigNumber(snapshot.amount);
    const type = snapshot.balance_type as keyof BalanceState;
    if (balance[type] !== undefined) {
      balance[type] = balance[type].plus(amount);
    }
  }

  private deepCopyBalance(balance: BalanceState): BalanceState {
    return {
      flexible: new BigNumber(balance.flexible),
      locked_30: new BigNumber(balance.locked_30),
      locked_90: new BigNumber(balance.locked_90),
      locked_180: new BigNumber(balance.locked_180),
      locked_365: new BigNumber(balance.locked_365)
    };
  }

  private calculateSegmentYield(balance: BalanceState, fromTime: number, toTime: number, assetType: 'USDT' | 'RWA'): any {
    const duration = toTime - fromTime;
    let totalYield = new BigNumber(0);
    const balanceDetails: any = {};

    for (const [type, amount] of Object.entries(balance)) {
      if (amount.isZero() || amount.isNegative()) continue;

      const lockPeriod = type === 'flexible' ? 0 : parseInt(type.replace('locked_', ''));
      const yieldRate = this.getYieldRate(lockPeriod);
      
      let yieldAmount: BigNumber;
      if (assetType === 'USDT') {
        // 注意：balance_snapshots 记录的 amount 已经是合约内部的 18 decimals（USDT 等值）。
        // 这里不要再做 6 -> 18 的乘 1e12，避免把收益放大 1e12。
        const rwaEquivalent = amount.dividedBy(0.85);
        yieldAmount = rwaEquivalent.multipliedBy(yieldRate).multipliedBy(duration).dividedBy(86400);
      } else {
        // RWA已经是18位小数
        yieldAmount = amount.multipliedBy(yieldRate).multipliedBy(duration).dividedBy(86400);
      }

      totalYield = totalYield.plus(yieldAmount);
      balanceDetails[type] = {
        balance: amount.toFixed(0),
        yield_rate: yieldRate,
        yield: yieldAmount.toFixed(0)
      };
    }

    return {
      from: fromTime,
      to: toTime,
      duration,
      balances: balanceDetails,
      yield: totalYield.toFixed(0)
    };
  }

  private getYieldRate(lockPeriod: number): number {
    const bonus = this.LOCK_BONUS[lockPeriod as keyof typeof this.LOCK_BONUS] || 0;
    return this.BASE_YIELD_RATE * (1 + bonus);
  }

  async getLastSettlementTime(userAddress: string, assetType: 'USDT' | 'RWA'): Promise<number> {
    const addr = normalizeSettlementUserAddress(userAddress);
    const result = await query<Array<{ settlement_time: number }>>(
      `SELECT settlement_time FROM yield_settlements WHERE LOWER(TRIM(user_address)) = ? AND asset_type = ? ORDER BY settlement_time DESC LIMIT 1`,
      [addr, assetType]
    );
    if (result.length > 0) return result[0].settlement_time;

    const firstStake = await query<Array<{ timestamp: number }>>(
      `SELECT timestamp FROM balance_snapshots WHERE LOWER(TRIM(user_address)) = ? AND asset_type = ? AND event_type = 'stake' ORDER BY timestamp ASC LIMIT 1`,
      [addr, assetType]
    );
    return firstStake.length > 0 ? firstStake[0].timestamp : 0;
  }
}


