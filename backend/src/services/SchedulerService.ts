import * as cron from 'node-cron';
import { DirectReferralRewardService } from './DirectReferralRewardService';
import { DailySettlementService } from './DailySettlementService';
import { PriceOracleService } from './PriceOracleService';
import { NodeLevelService } from './NodeLevelService';
import { LockMaturityService } from './LockMaturityService';
import logger from '../utils/logger';

interface SchedulerConfig {
  dailyYieldCron: string;
  lockMaturityCron: string;
  priceRefreshCron: string;
  nodeLevelSyncCron: string;
}

export class SchedulerService {
  private config: SchedulerConfig;
  private dailySettlementService: DailySettlementService;
  private priceOracleService: PriceOracleService;
  private nodeLevelService: NodeLevelService;
  private lockMaturityService: LockMaturityService;
  private referralService?: DirectReferralRewardService;
  private jobs: cron.ScheduledTask[] = [];

  constructor(
    config: SchedulerConfig,
    dailySettlementService: DailySettlementService,
    priceOracleService: PriceOracleService,
    nodeLevelService: NodeLevelService,
    lockMaturityService: LockMaturityService,
    referralService?: DirectReferralRewardService
  ) {
    this.config = config;
    this.dailySettlementService = dailySettlementService;
    this.priceOracleService = priceOracleService;
    this.nodeLevelService = nodeLevelService;
    this.lockMaturityService = lockMaturityService;
    this.referralService = referralService;
  }

  start() {
    // 每天早上8点发放收益
    const dailyJob = cron.schedule(this.config.dailyYieldCron, async () => {
      logger.info('开始每日收益结算...');
      try {
        await this.dailySettlementService.runDailySettlement();
        logger.info('每日收益结算完成');
      } catch (error) {
        logger.error('每日收益结算失败:', error);
      }
    });
    this.jobs.push(dailyJob);

    // 每周一凌晨2点发放推荐奖励
    if (this.referralService) {
      const referralJob = cron.schedule('0 2 * * 1', async () => {
        logger.info('开始每周推荐奖励结算...');
        try {
          await this.referralService!.weeklySettlement();
          logger.info('每周推荐奖励结算完成');
        } catch (error) {
          logger.error('每周推荐奖励结算失败:', error);
        }
      });
      this.jobs.push(referralJob);
    }

    logger.info('定时任务已启动');
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
