import { query } from '../config/database.config';
import logger from '../utils/logger';
import { ethers } from 'ethers';
import type { ResultSetHeader } from 'mysql2';
import { normalizeSettlementUserAddress } from '../utils/settlementAddress';
import { discoverStakerAddressesFromChain } from './on-chain/StakerAddressDiscovery';
import { OnChainYieldCalculator } from './on-chain/OnChainYieldCalculator';
import { findBlockAtOrBefore } from './on-chain/chainSettlementUtils';
import { acquireDailySettlementLock } from './settlementDistributedLock';
import { isMysqlDuplicateKey } from '../utils/mysqlErrors';

export { normalizeSettlementUserAddress } from '../utils/settlementAddress';

const YIELD_PENDING_TX = 'PENDING';

/**
 * - chain：从链上 StakeEvent 日志收集地址（失败则回退 stake_events → users）
 * - db：仅从 stake_events 收集地址（不再用 balance_snapshots，避免重复行放大收益）
 *
 * 收益金额：**始终**用 OnChainYieldCalculator（结算窗口起点区块读合约仓位），即
 * 每笔质押本金在合约侧汇总后 × 日收益率 × 窗口时长；与 yield_settlements 唯一键配合，每用户每资产每日最多发一次。
 */
export type DailySettlementDataSource = 'chain' | 'db';

export class DailySettlementService {
  private onChainCalculator: OnChainYieldCalculator;
  private stakingContract: ethers.Contract;
  private provider: ethers.JsonRpcProvider;
  private dataSource: DailySettlementDataSource;
  private stakingDeployBlock: number;

  constructor(config: {
    rpcUrl: string;
    stakingContractAddress: string;
    backendPrivateKey: string;
    /** 默认 chain：仅影响「待结算用户」如何发现；收益一律链上计算 */
    dataSource?: DailySettlementDataSource;
    /** 扫描 StakeEvent 的起始块；未设时回退为 latest-500000 并打 warn */
    stakingDeployBlock?: number;
  }) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.backendPrivateKey, this.provider);
    const stakingABI = ["function updateUserRewards(address user, uint256 rwAmount, uint256 usdtAmount, uint256 stakeId) external"];
    this.stakingContract = new ethers.Contract(config.stakingContractAddress, stakingABI, wallet);
    this.onChainCalculator = new OnChainYieldCalculator(this.provider, config.stakingContractAddress);

    const envSrc = (process.env.DAILY_SETTLEMENT_DATA_SOURCE || '').toLowerCase();
    this.dataSource =
      config.dataSource ?? (envSrc === 'db' ? 'db' : 'chain');

    const fromEnv = parseInt(process.env.STAKING_DEPLOY_BLOCK || '', 10);
    this.stakingDeployBlock =
      config.stakingDeployBlock ??
      (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 0);
  }

  /**
   * @param options.toTime 可选：显式指定结算窗口右端点（Unix 秒），须为「北京时间当日 08:00」= 该日 UTC 00:00。
   * 用于补发历史某日；不传则与定时任务相同，取当前时刻下「最近一次已过去的北京 8 点」。
   */
  async runDailySettlement(options?: { toTime?: number }): Promise<void> {
    const lock = await acquireDailySettlementLock();
    if (!lock) {
      logger.warn('[DailySettlement] 未获取分布式锁，整批跳过（避免多实例重复发）');
      return;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const toTime =
        options?.toTime !== undefined && Number.isFinite(options.toTime)
          ? Math.floor(options.toTime)
          : this.getLastCompletedShanghai8AM(now);
      if (options?.toTime !== undefined) {
        this.assertToTimeIsShanghai8amBoundary(toTime);
      }
      const fromTime = toTime - 86400;
      logger.info(
        `Starting daily settlement dataSource=${this.dataSource} [toTime=北京8点/UTC0点日界]: ${new Date(fromTime * 1000).toISOString()} → ${new Date(toTime * 1000).toISOString()}`
      );

      const blockAtFrom = await findBlockAtOrBefore(this.provider, fromTime);

      const users = await this.getActiveUsers(blockAtFrom);

      logger.info(
        `Daily settlement dataSource=${this.dataSource}, users=${users.length}, blockAtFrom=${blockAtFrom} (yield=on-chain buckets @ this block)`
      );

      let successCount = 0;

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        try {
          await this.settleUserYield(user.address, user.asset_type, fromTime, toTime, blockAtFrom);
          successCount++;
          
          // --- Rate Limit 冗余设计 ---
          // QuickNode 限制约为 15-20 RPS，每个账户结算约需 4-8 次请求。
          // 每处理一个账户后休眠 500ms（即每秒最多处理 2 个账户），约消耗 8-16 RPS，
          // 为其他并发业务（如前端查询、监控）预留了约 50% 的速率额度。
          if (i < users.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          logger.error(`Failed to settle ${user.address} (${user.asset_type}):`, error);
        }
      }

      logger.info(`✅ Daily settlement completed: ${successCount}/${users.length} users`);
    } finally {
      await lock.release();
    }
  }

  private async settleUserYield(
    userAddress: string,
    assetType: 'USDT' | 'RWA',
    fromTime: number,
    toTime: number,
    blockAtFrom: number
  ): Promise<void> {
    const addr = normalizeSettlementUserAddress(userAddress);

    // 先占位写入（唯一键存在时立即失败），再发链上，避免：链上已成功但 DB 未写入导致下一周期再次 updateUserRewards
    try {
      await query(
        `INSERT INTO yield_settlements (user_address, asset_type, settlement_time, from_time, to_time, total_yield, calculation_details, tx_hash)
         VALUES (?, ?, ?, ?, ?, '0', NULL, ?)`,
        [addr, assetType, toTime, fromTime, toTime, YIELD_PENDING_TX]
      );
    } catch (e) {
      if (isMysqlDuplicateKey(e)) {
        logger.info(`Already settled (unique) for ${addr} (${assetType}) at ${toTime}`);
        return;
      }
      throw e;
    }

    const calcAddress = (() => {
      try {
        return ethers.getAddress(addr);
      } catch {
        return addr;
      }
    })();

    const { totalYield, details } = await this.onChainCalculator.calculateYield(
      calcAddress,
      assetType,
      fromTime,
      toTime,
      this.provider,
      blockAtFrom
    );
    if (totalYield === '0') {
      logger.info(`No yield for ${addr} (${assetType})`);
      await query(
        `DELETE FROM yield_settlements WHERE user_address = ? AND asset_type = ? AND settlement_time = ? AND tx_hash = ?`,
        [addr, assetType, toTime, YIELD_PENDING_TX]
      );
      return;
    }

    const stakeId = BigInt(Date.now()) * 10000n + BigInt(Math.floor(Math.random() * 10000));
    const yieldWei = BigInt(totalYield);

    // yieldWei 是计算出来的 18 decimals 数值：
    // - assetType='USDT'：计算结果是按 1 RWA ≈ 0.85 USDT 换算后的 RWA 等值收益
    // - assetType='RWA' ：计算结果就是 RWA 收益
    //
    // 合约 updateUserRewards 的分支逻辑是：usdtAmount==0 => RWA staking reward；usdtAmount!=0 => USDT staking reward。
    // 所以 assetType='USDT' 必须传 usdtAmount != 0，assetType='RWA' 必须传 usdtAmount == 0。
    const yieldTokenStr = ethers.formatEther(yieldWei);
    logger.info(`Updating contract: ${addr} ${assetType} yield=${yieldTokenStr}`);

    try {
      let tx;
      if (assetType === 'USDT') {
        const rwAmount = yieldWei;
        const usdtAmount = (yieldWei * 85n) / 100n;
        tx = await this.stakingContract.updateUserRewards(calcAddress, rwAmount, usdtAmount, stakeId);
      } else {
        tx = await this.stakingContract.updateUserRewards(calcAddress, yieldWei, 0, stakeId);
      }
      await tx.wait();
      logger.info(`✅ Contract updated: ${tx.hash}`);

      const totalYieldForDB = ethers.formatEther(yieldWei);
      const upd = await query<ResultSetHeader>(
        `UPDATE yield_settlements SET total_yield = ?, calculation_details = ?, tx_hash = ?
         WHERE user_address = ? AND asset_type = ? AND settlement_time = ? AND tx_hash = ?`,
        [totalYieldForDB, JSON.stringify(details), tx.hash, addr, assetType, toTime, YIELD_PENDING_TX]
      );
      const affected = typeof upd === 'object' && upd !== null && 'affectedRows' in upd ? (upd as ResultSetHeader).affectedRows : 0;
      if (affected !== 1) {
        logger.error(
          `[CRITICAL] 链上已发日结但 yield_settlements 更新行数=${affected}，请人工对账: ${addr} ${assetType} toTime=${toTime} tx=${tx.hash}`
        );
      }

      await query(
        `INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp) VALUES (?, 'daily_yield', 'RWA', ?, NOW())`,
        [addr, totalYield]
      );
    } catch (err) {
      await query(
        `DELETE FROM yield_settlements WHERE user_address = ? AND asset_type = ? AND settlement_time = ? AND tx_hash = ?`,
        [addr, assetType, toTime, YIELD_PENDING_TX]
      );
      throw err;
    }
  }

  private async getActiveUsers(
    blockAtFrom: number
  ): Promise<Array<{ address: string; asset_type: 'USDT' | 'RWA' }>> {
    let addresses: string[];

    if (this.dataSource === 'db') {
      logger.warn(
        '[DailySettlement] DAILY_SETTLEMENT_DATA_SOURCE=db：仅从 stake_events 取候选地址（已废弃 balance_snapshots）；收益仍按链上仓位计算。建议改为 chain。'
      );
      const rows = await query<Array<{ address: string }>>(
        `SELECT DISTINCT LOWER(TRIM(user_address)) AS address FROM stake_events
         WHERE amount > 0 AND event_type IN ('USDT','RWA')
           AND user_address IS NOT NULL AND TRIM(user_address) != ''`
      );
      addresses = rows.map((r) => normalizeSettlementUserAddress(r.address));
    } else {
    const latest = await this.provider.getBlockNumber();
    let fromBlock = this.stakingDeployBlock;
    if (!fromBlock || fromBlock < 0) {
      // 公共 RPC 常修剪历史日志；500000 块窗口易触发 eth_getLogs「pruned」。可用 STAKING_LOG_SCAN_LOOKBACK 覆盖（仍建议配置 STAKING_DEPLOY_BLOCK）
      const lookback = Math.min(
        500_000,
        Math.max(
          10_000,
          parseInt(process.env.STAKING_LOG_SCAN_LOOKBACK || '120000', 10) || 120_000
        )
      );
      fromBlock = Math.max(0, latest - lookback);
      logger.warn(
        `[DailySettlement] STAKING_DEPLOY_BLOCK 未配置，日志扫描自 latest-${lookback} = ${fromBlock}，` +
          `若漏用户或仍报 pruned，请在 .env 设置 STAKING_DEPLOY_BLOCK（合约部署块）或使用归档全节点 RPC`
      );
    }

    try {
      addresses = await discoverStakerAddressesFromChain({
        provider: this.provider,
        stakingContractAddress: this.stakingContract.target as string,
        fromBlock,
        toBlock: latest,
      });
    } catch (e) {
      logger.warn(
        '[DailySettlement] 链上日志扫描失败，先回退 stake_events 地址，再回退 users 表（仍用合约 view 过滤当期仓位）:',
        e
      );
      const seRows = await query<Array<{ address: string }>>(
        `SELECT DISTINCT LOWER(TRIM(user_address)) AS address FROM stake_events
         WHERE amount > 0 AND event_type IN ('USDT','RWA')
           AND user_address IS NOT NULL AND TRIM(user_address) != ''`
      );
      addresses = seRows.map((r) => r.address);
      if (addresses.length === 0) {
        const uRows = await query<Array<{ address: string }>>(
          `SELECT DISTINCT LOWER(address) as address FROM users WHERE address IS NOT NULL AND address != ''`
        );
        addresses = uRows.map((r) => r.address);
      }
      if (addresses.length === 0) {
        logger.error('[DailySettlement] 回退列表为空，请检查 stake_events/users 或修复 RPC / STAKING_DEPLOY_BLOCK');
        throw e;
      }
      logger.info(`[DailySettlement] 回退地址数: ${addresses.length}`);
    }
    }


    const users: Array<{ address: string; asset_type: 'USDT' | 'RWA' }> = [];

    for (const raw of addresses) {
      const address = raw.toLowerCase();
      const [hasRwa, hasUsdt] = await Promise.all([
        this.onChainCalculator.hadRwaPositionAt(address, blockAtFrom),
        this.onChainCalculator.hadUsdtPositionAt(address, blockAtFrom),
      ]);
      if (hasRwa) users.push({ address, asset_type: 'RWA' });
      if (hasUsdt) users.push({ address, asset_type: 'USDT' });
    }

    return users;
  }

  /**
   * 给定 Unix 秒，返回「当前时刻之前（含整点）最近一次北京时间 08:00:00」的 Unix 秒。
   * 上海无夏令时：本地 08:00 = 同日 UTC 00:00。
   */
  private getLastCompletedShanghai8AM(nowSec: number): number {
    const ymd = this.getShanghaiYMDFromUnix(nowSec);
    const today8 = this.shanghaiLocal8amUnix(ymd.y, ymd.m, ymd.d);
    if (nowSec < today8) {
      return today8 - 86400;
    }
    return today8;
  }

  private getShanghaiYMDFromUnix(nowSec: number): { y: number; m: number; d: number } {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const s = fmt.format(new Date(nowSec * 1000));
    const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
    return { y, m, d };
  }

  /** 北京时间 y-m-d 当天 08:00:00 对应的 Unix 秒 */
  private shanghaiLocal8amUnix(y: number, m: number, day: number): number {
    return Math.floor(Date.UTC(y, m - 1, day, 0, 0, 0) / 1000);
  }

  /** 防止误传任意 Unix 导致与产品日界不一致 */
  private assertToTimeIsShanghai8amBoundary(toTime: number): void {
    const ymd = this.getShanghaiYMDFromUnix(toTime);
    const expected = this.shanghaiLocal8amUnix(ymd.y, ymd.m, ymd.d);
    if (expected !== toTime) {
      throw new Error(
        `Invalid settlement toTime=${toTime} (${new Date(toTime * 1000).toISOString()}): ` +
          `not a Beijing 08:00 boundary (Asia/Shanghai calendar day start at UTC 00:00). ` +
          `For that calendar day expect ${expected}.`
      );
    }
  }

  /** 北京时间 yyyy-mm-dd 当天 08:00 的 toTime（Unix 秒），用于脚本 / 运维 */
  static shanghaiDateToToTime(y: number, m: number, day: number): number {
    return Math.floor(Date.UTC(y, m - 1, day, 0, 0, 0) / 1000);
  }
}
