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
          await this.dailySettlementService.runDailySettlement();
          logger.info('每日收益结算完成');
        } catch (error) {
          logger.error('每日收益结算失败:', error);
        }
      },
      cronOpts
    );
    this.jobs.push(dailyJob);
    const nextDaily = dailyJob.getNextRun();
    logger.info(
      `[Scheduler] 每日收益已注册: cron="${this.config.dailyYieldCron}" tz="${tz}" 下次计划执行(UTC)=${nextDaily?.toISOString() ?? '未知（任务已停止？）'}`
    );

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
