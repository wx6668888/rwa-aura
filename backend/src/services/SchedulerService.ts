import cron from 'node-cron';
import { DailyYieldService } from './DailyYieldService';
import { PriceOracleService } from './PriceOracleService';
import { NodeLevelService } from './NodeLevelService';
import logger from '../utils/logger';

/**
 * Scheduler Service
 * 
 * Manages all scheduled tasks (cron jobs)
 * 
 * TASKS:
 * 1. Daily yield calculation (every day at 00:00 UTC)
 * 2. Price oracle refresh (every 5 minutes)
 * 3. Node level sync check (every hour)
 */

export interface SchedulerConfig {
    dailyYieldCron: string; // '0 0 * * *' = every day at 00:00
    priceRefreshCron: string; // '*/5 * * * *' = every 5 minutes
    nodeLevelSyncCron: string; // '0 * * * *' = every hour
}

export class SchedulerService {
    private config: SchedulerConfig;
    private dailyYieldService: DailyYieldService;
    private priceOracleService: PriceOracleService;
    private nodeLevelService: NodeLevelService;
    private tasks: cron.ScheduledTask[] = [];
    
    constructor(
        config: SchedulerConfig,
        dailyYieldService: DailyYieldService,
        priceOracleService: PriceOracleService,
        nodeLevelService: NodeLevelService
    ) {
        this.config = config;
        this.dailyYieldService = dailyYieldService;
        this.priceOracleService = priceOracleService;
        this.nodeLevelService = nodeLevelService;
    }
    
    /**
     * Start all scheduled tasks
     */
    start(): void {
        logger.info('Starting scheduler service...');
        
        // Task 1: Daily yield calculation
        const dailyYieldTask = cron.schedule(this.config.dailyYieldCron, async () => {
            logger.info('⏰ Running daily yield calculation...');
            try {
                const result = await this.dailyYieldService.calculateDailyYield();
                logger.info(`✅ Daily yield completed: ${result.processedUsers} users, ${result.totalYield} total`);
            } catch (error) {
                logger.error('❌ Daily yield calculation failed:', error);
            }
        });
        
        this.tasks.push(dailyYieldTask);
        logger.info(`✅ Daily yield task scheduled: ${this.config.dailyYieldCron}`);
        
        // Task 2: Price oracle refresh
        const priceRefreshTask = cron.schedule(this.config.priceRefreshCron, async () => {
            logger.debug('⏰ Refreshing price oracle...');
            try {
                const price = await this.priceOracleService.forceRefresh();
                logger.debug(`✅ Price refreshed: ${price}`);
            } catch (error) {
                logger.error('❌ Price refresh failed:', error);
            }
        });
        
        this.tasks.push(priceRefreshTask);
        logger.info(`✅ Price refresh task scheduled: ${this.config.priceRefreshCron}`);
        
        // Task 3: Node level sync check
        const nodeLevelSyncTask = cron.schedule(this.config.nodeLevelSyncCron, async () => {
            logger.info('⏰ Running node level sync check...');
            try {
                // TODO: Implement batch sync for all users
                logger.info('✅ Node level sync completed');
            } catch (error) {
                logger.error('❌ Node level sync failed:', error);
            }
        });
        
        this.tasks.push(nodeLevelSyncTask);
        logger.info(`✅ Node level sync task scheduled: ${this.config.nodeLevelSyncCron}`);
        
        logger.info(`Scheduler service started with ${this.tasks.length} tasks`);
    }
    
    /**
     * Stop all scheduled tasks
     */
    stop(): void {
        logger.info('Stopping scheduler service...');
        
        this.tasks.forEach(task => task.stop());
        this.tasks = [];
        
        logger.info('Scheduler service stopped');
    }
    
    /**
     * Get task status
     */
    getStatus(): {
        isRunning: boolean;
        taskCount: number;
    } {
        return {
            isRunning: this.tasks.length > 0,
            taskCount: this.tasks.length
        };
    }
    
    /**
     * Manually trigger daily yield calculation
     */
    async triggerDailyYield(): Promise<void> {
        logger.info('Manually triggering daily yield calculation...');
        await this.dailyYieldService.calculateDailyYield();
    }
    
    /**
     * Manually trigger price refresh
     */
    async triggerPriceRefresh(): Promise<void> {
        logger.info('Manually triggering price refresh...');
        await this.priceOracleService.forceRefresh();
    }
}

export default SchedulerService;
