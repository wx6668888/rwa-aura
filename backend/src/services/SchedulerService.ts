import * as cron from 'node-cron';
import { DirectReferralRewardService } from './DirectReferralRewardService';
import { DailySettlementService } from './DailySettlementService';
import { PriceOracleService } from './PriceOracleService';
import { NodeLevelService } from './NodeLevelService';
import { LockMaturityService } from './LockMaturityService';
import { RwaPendingSyncService } from './RwaPendingSyncService';
import logger from '../utils/logger';

interface SchedulerConfig {
  dailyYieldCron: string;
  /** node-cron 时区，如 Asia/Shanghai；与服务器 TZ 无关，保证「早 8 点」为北京时间 */
  cronTimezone?: string;
  lockMaturityCron: string;
  priceRefreshCron: string;
  nodeLevelSyncCron: string;
  rwaPendingSyncCron?: string;
  onDailySettlementStart?: () => Promise<void> | void;
  onDailySettlementEnd?: () => Promise<void> | void;
  /** 日结补跑/续跑 cron（例如：8 点整到 8 点 59 分每 5 分钟一次），用于 8:00~8:30 内自动补齐 */
  dailyYieldRetryCron?: string;
  /** 补跑窗口结束分钟（默认 30：8:30 前都可补跑） */
  dailyYieldRetryWindowEndMinute?: number;
}

export class SchedulerService {
  private config: SchedulerConfig;
  private dailySettlementService: DailySettlementService;
  private priceOracleService: PriceOracleService;
  private nodeLevelService: NodeLevelService;
  private lockMaturityService: LockMaturityService;
  private referralService?: DirectReferralRewardService;
  private rwaPendingSyncService?: RwaPendingSyncService;
  private jobs: cron.ScheduledTask[] = [];

  constructor(
    config: SchedulerConfig,
    dailySettlementService: DailySettlementService,
    priceOracleService: PriceOracleService,
    nodeLevelService: NodeLevelService,
    lockMaturityService: LockMaturityService,
    referralService?: DirectReferralRewardService,
    rwaPendingSyncService?: RwaPendingSyncService
  ) {
    this.config = config;
    this.dailySettlementService = dailySettlementService;
    this.priceOracleService = priceOracleService;
    this.nodeLevelService = nodeLevelService;
    this.lockMaturityService = lockMaturityService;
    this.referralService = referralService;
    this.rwaPendingSyncService = rwaPendingSyncService;
  }

  start() {
    const tz = this.config.cronTimezone || 'Asia/Shanghai';
    const cronOpts = { timezone: tz };

    // 每天早上8点发放收益（默认按 cronTimezone，一般为北京时间）
    const dailyJob = cron.schedule(
      this.config.dailyYieldCron,
      async () => {
        logger.info('开始每日收益结算...');
        try {
          if (this.config.onDailySettlementStart) {
            await this.config.onDailySettlementStart();
          }
        } catch (e) {
          logger.warn('[Scheduler] onDailySettlementStart hook failed:', e);
        }
        try {
          await this.dailySettlementService.runDailySettlement();
          logger.info('每日收益结算完成');
        } catch (error) {
          logger.error('每日收益结算失败:', error);
        } finally {
          try {
            if (this.config.onDailySettlementEnd) {
              await this.config.onDailySettlementEnd();
            }
          } catch (e) {
            logger.warn('[Scheduler] onDailySettlementEnd hook failed:', e);
          }
        }
      },
      cronOpts
    );
    this.jobs.push(dailyJob);
    const nextDaily = dailyJob.getNextRun();
    logger.info(
      `[Scheduler] 每日收益已注册: cron="${this.config.dailyYieldCron}" tz="${tz}" 下次计划执行(UTC)=${nextDaily?.toISOString() ?? '未知（任务已停止？）'}`
    );

    // 日结补跑：在 8:00~8:30 窗口内周期性续跑，确保即使 429/崩溃也能补齐；靠 yield_settlements 唯一键保证不重复发放。
    if (this.config.dailyYieldRetryCron) {
      const endMin = Math.max(0, Math.min(59, this.config.dailyYieldRetryWindowEndMinute ?? 30));
      const retryJob = cron.schedule(
        this.config.dailyYieldRetryCron,
        async () => {
          // 仅在 cronTimezone 的 8:00~8:30 生效（避免 8 点之后无限续跑）
          try {
            const fmt = new Intl.DateTimeFormat('en-GB', {
              timeZone: tz,
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            const parts = fmt.formatToParts(new Date());
            const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
            const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
            if (hour !== 8) return;
            if (minute > endMin) return;
          } catch {
            // Intl 异常时不阻塞；锁机制兜底防并发/重复
          }

          logger.info('[Scheduler] 日结补跑触发：尝试续跑未完成地址（8:00~8:30 窗口）');
          try {
            if (this.config.onDailySettlementStart) {
              await this.config.onDailySettlementStart();
            }
          } catch (e) {
            logger.warn('[Scheduler] onDailySettlementStart hook failed (retry):', e);
          }
          try {
            await this.dailySettlementService.runDailySettlement();
            logger.info('[Scheduler] 日结补跑完成');
          } catch (error) {
            logger.error('[Scheduler] 日结补跑失败:', error);
          } finally {
            try {
              if (this.config.onDailySettlementEnd) {
                await this.config.onDailySettlementEnd();
              }
            } catch (e) {
              logger.warn('[Scheduler] onDailySettlementEnd hook failed (retry):', e);
            }
          }
        },
        cronOpts
      );
      this.jobs.push(retryJob);
      const nextRetry = retryJob.getNextRun();
      logger.info(
        `[Scheduler] 每日收益补跑已注册: cron="${this.config.dailyYieldRetryCron}" tz="${tz}" ` +
          `窗口结束分钟=${endMin} 下次计划执行(UTC)=${nextRetry?.toISOString() ?? '未知'}`
      );
    }

    // 每周一凌晨2点发放推荐奖励
    if (this.referralService) {
      const referralJob = cron.schedule(
        '0 2 * * 1',
        async () => {
          logger.info('开始每周推荐奖励结算...');
          try {
            await this.referralService!.weeklySettlement();
            logger.info('每周推荐奖励结算完成');
          } catch (error) {
            logger.error('每周推荐奖励结算失败:', error);
          }
        },
        cronOpts
      );
      this.jobs.push(referralJob);
    }

    // 每分钟同步 rwaPending
    if (this.rwaPendingSyncService && this.config.rwaPendingSyncCron) {
      const rwaPendingJob = cron.schedule(
        this.config.rwaPendingSyncCron,
        async () => {
          try {
            await this.rwaPendingSyncService!.syncAllUsers();
          } catch (error) {
            logger.error('rwaPending 同步失败:', error);
          }
        },
        cronOpts
      );
      this.jobs.push(rwaPendingJob);
    }

    logger.info(`定时任务已启动 (cron 时区: ${tz})`);
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    logger.info('定时任务已停止');
  }

  getStatus() {
    return {
      running: this.jobs.length > 0,
      jobCount: this.jobs.length
    };
  }
}
