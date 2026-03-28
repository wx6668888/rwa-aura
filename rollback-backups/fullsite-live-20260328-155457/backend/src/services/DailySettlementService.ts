import { query } from '../config/database.config';
import logger from '../utils/logger';
import { ethers } from 'ethers';
import { PreciseYieldCalculator } from './PreciseYieldCalculator';
import { discoverStakerAddressesFromChain } from './on-chain/StakerAddressDiscovery';
import { OnChainYieldCalculator } from './on-chain/OnChainYieldCalculator';
import { findBlockAtOrBefore } from './on-chain/chainSettlementUtils';

export type DailySettlementDataSource = 'chain' | 'db';

export class DailySettlementService {
  private calculator: PreciseYieldCalculator;
  private onChainCalculator: OnChainYieldCalculator;
  private stakingContract: ethers.Contract;
  private provider: ethers.JsonRpcProvider;
  private dataSource: DailySettlementDataSource;
  private stakingDeployBlock: number;

  constructor(config: {
    rpcUrl: string;
    stakingContractAddress: string;
    backendPrivateKey: string;
    /** 默认 chain：用户与仓位来自链上日志+合约 view；db 为旧逻辑（依赖 balance_snapshots） */
    dataSource?: DailySettlementDataSource;
    /** 扫描 StakeEvent 的起始块；未设时回退为 latest-500000 并打 warn */
    stakingDeployBlock?: number;
  }) {
    this.calculator = new PreciseYieldCalculator();
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
    const now = Math.floor(Date.now() / 1000);
    // 结算窗口：toTime = 当前「已过去的」北京时间当日 08:00（= 同日 UTC 00:00），与「UTC 0 点即北京 8 点」日界一致
    const toTime =
      options?.toTime !== undefined && Number.isFinite(options.toTime)
        ? Math.floor(options.toTime)
        : this.getLastCompletedShanghai8AM(now);
    if (options?.toTime !== undefined) {
      this.assertToTimeIsShanghai8amBoundary(toTime);
    }
    const fromTime = toTime - 86400;
    logger.info(
      `Starting daily settlement [toTime=北京8点/UTC0点日界]: ${new Date(fromTime * 1000).toISOString()} → ${new Date(toTime * 1000).toISOString()}`
    );

    const blockAtFrom =
      this.dataSource === 'chain'
        ? await findBlockAtOrBefore(this.provider, fromTime)
        : undefined;

    const users = await this.getActiveUsers(blockAtFrom);

    logger.info(
      `Daily settlement dataSource=${this.dataSource}, users=${users.length}` +
        (blockAtFrom !== undefined ? `, blockAtFrom=${blockAtFrom}` : '')
    );

    let successCount = 0;

    for (const user of users) {
      try {
        await this.settleUserYield(user.address, user.asset_type, fromTime, toTime, blockAtFrom);
        successCount++;
      } catch (error) {
        logger.error(`Failed to settle ${user.address} (${user.asset_type}):`, error);
      }
    }

    logger.info(`✅ Daily settlement completed: ${successCount}/${users.length} users`);
  }

  private async settleUserYield(
    userAddress: string,
    assetType: 'USDT' | 'RWA',
    fromTime: number,
    toTime: number,
    blockAtFrom?: number
  ): Promise<void> {
    // 检查是否已结算（防重复）
    const existing = await query<Array<{ id: number }>>(`
      SELECT id FROM yield_settlements 
      WHERE user_address = ? AND asset_type = ? AND settlement_time = ?
    `, [userAddress, assetType, toTime]);
    
    if (existing.length > 0) {
      logger.info(`Already settled for ${userAddress} (${assetType}) at ${toTime}`);
      return;
    }

    const { totalYield, details } =
      this.dataSource === 'chain'
        ? await this.onChainCalculator.calculateYield(
            userAddress,
            assetType,
            fromTime,
            toTime,
            this.provider,
            blockAtFrom
          )
        : await this.calculator.calculateYield(userAddress, assetType, fromTime, toTime);
    if (totalYield === '0') {
      logger.info(`No yield for ${userAddress} (${assetType})`);
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
    logger.info(`Updating contract: ${userAddress} ${assetType} yield=${yieldTokenStr}`);

    let tx;
    if (assetType === 'USDT') {
      // 合约内动态奖励：USDT 分支需要 usdtAmount != 0
      // 1 RWA = 0.85 USDT => usdtAmount = rwAmount * 85 / 100
      const rwAmount = yieldWei; // RWA 等值，用于写入 user.rwaPending
      const usdtAmount = (yieldWei * 85n) / 100n; // 用于触发合约 USDT 分支与做 cap 校验
      tx = await this.stakingContract.updateUserRewards(userAddress, rwAmount, usdtAmount, stakeId);
    } else {
      tx = await this.stakingContract.updateUserRewards(userAddress, yieldWei, 0, stakeId);
    }
    await tx.wait();
    logger.info(`✅ Contract updated: ${tx.hash}`);

    // yield_settlements.total_yield 定义为 DECIMAL(36,18)，需要写入“带小数”的金额
    // 不能直接写入 wei 整数，否则会被当作 0 小数位的大整数导致 Out of range。
    const totalYieldForDB = ethers.formatEther(yieldWei);
    await query(`INSERT INTO yield_settlements (user_address, asset_type, settlement_time, from_time, to_time, total_yield, calculation_details, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userAddress, assetType, toTime, fromTime, toTime, totalYieldForDB, JSON.stringify(details), tx.hash]);
    await query(`INSERT INTO rewards (user_address, reward_type, token_type, amount, timestamp) VALUES (?, 'daily_yield', 'RWA', ?, NOW())`,
      [userAddress, totalYield]);
  }

  private async getActiveUsers(
    blockAtFrom?: number
  ): Promise<Array<{ address: string; asset_type: 'USDT' | 'RWA' }>> {
    if (this.dataSource === 'db') {
      const users: Array<{ address: string; asset_type: 'USDT' | 'RWA' }> = [];
      const usdtUsers = await query<Array<{ address: string }>>(
        `SELECT DISTINCT user_address as address FROM balance_snapshots WHERE asset_type = 'USDT'`
      );
      users.push(...usdtUsers.map((u) => ({ address: u.address, asset_type: 'USDT' as const })));
      const rwaUsers = await query<Array<{ address: string }>>(
        `SELECT DISTINCT user_address as address FROM balance_snapshots WHERE asset_type = 'RWA'`
      );
      users.push(...rwaUsers.map((u) => ({ address: u.address, asset_type: 'RWA' as const })));
      return users;
    }

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

    let addresses: string[];
    try {
      addresses = await discoverStakerAddressesFromChain({
        provider: this.provider,
        stakingContractAddress: this.stakingContract.target as string,
        fromBlock,
        toBlock: latest,
      });
    } catch (e) {
      logger.warn(
        '[DailySettlement] 链上日志扫描失败（RPC 修剪/限流等），改用数据库 users 表地址列表作为回退（仍用合约 view 判断 RWA/USDT 仓位）:',
        e
      );
      const rows = await query<Array<{ address: string }>>(
        `SELECT DISTINCT LOWER(address) as address FROM users WHERE address IS NOT NULL AND address != ''`
      );
      addresses = rows.map((r) => r.address);
      if (addresses.length === 0) {
        logger.error('[DailySettlement] 回退列表为空，请检查 users 表或修复 RPC / 配置 STAKING_DEPLOY_BLOCK');
        throw e;
      }
      logger.info(`[DailySettlement] 回退地址数: ${addresses.length}`);
    }

    if (blockAtFrom === undefined) {
      throw new Error('[DailySettlement] chain 模式需要 blockAtFrom');
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
