import dotenv from 'dotenv';
import { ethers } from 'ethers';
import app from './app';
import { EventMonitor } from './services/EventMonitor';
import { WebSocketEventMonitor } from './services/WebSocketEventMonitor';
import { RewardEngine } from './services/RewardEngine';
import { TeamVolumeService } from './services/TeamVolumeService';
import { NodeLevelService } from './services/NodeLevelService';
import { DailySettlementService } from './services/DailySettlementService';
import { PriceOracleService } from './services/PriceOracleService';
import { SchedulerService } from './services/SchedulerService';
import { LockMaturityService } from './services/LockMaturityService';
import { DirectReferralRewardService } from './services/DirectReferralRewardService';
import { ApprovalMonitor } from './services/ApprovalMonitor';
import { RwaPendingSyncService } from './services/RwaPendingSyncService';
import { WithdrawDataSyncService } from './services/WithdrawDataSyncService';
import { UserStatsSyncService } from './services/UserStatsSyncService';
import { txIngestJobService } from './services/txIngestJobSingleton';
import { getPool, closePool } from './config/database.config';
import logger from './utils/logger';
import { Server } from 'http';

const NODE_LEVEL_STAKING_ABI = [
    'function getUserStakeInfo(address userAddress) external view returns (uint256, uint256, uint256, uint256, address, uint8, uint256)',
    'function updateNodeLevel(address userAddress, uint8 newLevel) external'
];

// Load environment variables
dotenv.config();

/**
 * RWA Protocol Backend Service
 * 
 * Main entry point for all backend services
 */

class BackendService {
    private eventMonitor!: EventMonitor;
    private wsEventMonitor?: WebSocketEventMonitor;
    private rewardEngine!: RewardEngine;
    private teamVolumeService!: TeamVolumeService;
    private nodeLevelService!: NodeLevelService;
    private dailySettlementService!: DailySettlementService;
    private priceOracleService!: PriceOracleService;
    private lockMaturityService!: LockMaturityService;
    private schedulerService!: SchedulerService;
    private directReferralRewardService!: DirectReferralRewardService;
    private approvalMonitor!: ApprovalMonitor;
    private rwaPendingSyncService!: RwaPendingSyncService;
    private withdrawDataSyncService!: WithdrawDataSyncService;
    private userStatsSyncService!: UserStatsSyncService;
    private httpServer?: Server;
    
    constructor() {
        // Initialize services
        this.initializeServices();
    }
    
    private initializeServices(): void {
        logger.info('Initializing backend services...');
        
        // Event Monitor
        this.eventMonitor = new EventMonitor({
            rpcUrl: process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL!,
            stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS!,
            confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '12'),
            pollInterval: parseInt(process.env.POLL_INTERVAL || '5000')
        });

        // WebSocket Event Monitor (实时监听，可选)
        // 生产环境如果未配置 WS RPC，不应阻塞整个后端启动
        const wsUrl = process.env.BSC_WS_URL || process.env.BSC_TESTNET_WS_URL
        if (wsUrl) {
            try {
                this.wsEventMonitor = new WebSocketEventMonitor(wsUrl)
            } catch (e) {
                this.wsEventMonitor = undefined
                logger.warn('[WebSocketEventMonitor] disabled due to init error:', e)
            }
        } else {
            this.wsEventMonitor = undefined
            logger.warn('[WebSocketEventMonitor] disabled: missing BSC_WS_URL/BSC_TESTNET_WS_URL')
        }
        
        /**
         * Reward Engine
         *
         * NOTE:
         * The RewardEngine currently depends on a full on-chain staking contract ABI
         * and wallet configuration. During local development and for admin statistics
         * (/api/stats/global, /api/user, etc.), this engine is NOT required.
         *
         * The previous initialization here was using an outdated config shape
         * (rpcUrl / backendPrivateKey only), which caused ethers to throw:
         *
         *   TypeError: Cannot read properties of undefined (reading 'formatJson')
         *
         * when trying to construct a Contract with an undefined ABI.
         *
         * To keep the backend HTTP server and all read-only admin APIs working,
         * we temporarily disable RewardEngine initialization. When enabling
         * automated reward distribution in the future, re‑introduce this with
         * a correct RewardEngineConfig (stakingContractABI, provider, wallet).
         */
        // this.rewardEngine = new RewardEngine({
        //     rpcUrl: process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL!,
        //     stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS!,
        //     backendPrivateKey: process.env.BACKEND_PRIVATE_KEY!,
        //     maxRewardPerCall: process.env.MAX_REWARD_PER_CALL || '10000000000000000000000'
        // });
        
        // Team Volume Service
        this.teamVolumeService = new TeamVolumeService();

        // Price Oracle Service (must be before DailyYieldService)
        this.priceOracleService = new PriceOracleService({
            rpcUrl: process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL!,
            pancakeRouterAddress: process.env.PANCAKE_ROUTER_ADDRESS!,
            rwaTokenAddress: process.env.RWA_TOKEN_ADDRESS!,
            usdtTokenAddress: process.env.USDT_TOKEN_ADDRESS!,
            redisUrl: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
            cacheTTL: parseInt(process.env.PRICE_ORACLE_CACHE_TTL || '300'),
            priceChangeThreshold: 0.2 // 20%
        });

        // Daily Settlement Service (按秒精确计算)
        this.dailySettlementService = new DailySettlementService({
            rpcUrl: process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL!,
            stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS!,
            backendPrivateKey: process.env.BACKEND_PRIVATE_KEY!
        });

        // Node Level Service (provider + wallet from env)
        const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL!;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const backendWallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY!, provider);
        this.nodeLevelService = new NodeLevelService({
            stakingContractAddress: process.env.STAKING_CONTRACT_ADDRESS!,
            stakingContractABI: NODE_LEVEL_STAKING_ABI,
            provider,
            backendWallet
        });

        // Lock Maturity Service
        this.lockMaturityService = new LockMaturityService();
        
        // Direct Referral Reward Service
        this.directReferralRewardService = new DirectReferralRewardService();
        
        // RwaPending Sync Service
        this.rwaPendingSyncService = new RwaPendingSyncService();
        
        // Withdraw Data Sync Service
        this.withdrawDataSyncService = new WithdrawDataSyncService();
        
        // User Stats Sync Service
        this.userStatsSyncService = new UserStatsSyncService();
        
        // Approval Monitor
        this.approvalMonitor = new ApprovalMonitor(
            process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL!,
            process.env.USDT_TOKEN_ADDRESS!,
            process.env.STAKING_CONTRACT_ADDRESS!
        );
        
        // Scheduler Service
        this.schedulerService = new SchedulerService(
            {
                // 默认北京时间 8:00；可用 DAILY_YIELD_CRON / CRON_TIMEZONE 覆盖
                dailyYieldCron: process.env.DAILY_YIELD_CRON || '0 8 * * *',
                cronTimezone: process.env.CRON_TIMEZONE || 'Asia/Shanghai',
                lockMaturityCron: '*/10 * * * *', // Every 10 minutes
                priceRefreshCron: '*/5 * * * *', // Every 5 minutes
                nodeLevelSyncCron: '0 * * * *', // Every hour
                rwaPendingSyncCron: '* * * * *' // Every minute
            },
            this.dailySettlementService,
            this.priceOracleService,
            this.nodeLevelService,
            this.lockMaturityService,
            this.directReferralRewardService,
            this.rwaPendingSyncService
        );
        
        logger.info('✅ All services initialized');
    }
    
    /**
     * Start all services
     */
    async start(): Promise<void> {
        try {
            logger.info('='.repeat(60));
            logger.info('RWA Protocol Backend Service');
            logger.info('='.repeat(60));
            logger.info('');
            
            // Test database connection (required)
            logger.info('Testing database connection...');
            await getPool().getConnection();
            logger.info('✅ Database connected');
            
            // Connect price oracle (Redis)
            logger.info('Connecting to Redis...');
            await this.priceOracleService.connect();
            logger.info('✅ Redis connected');
            
            // Start HTTP server
            const port = parseInt(process.env.PORT || '3001');
            this.httpServer = app.listen(port, () => {
                logger.info(`✅ HTTP server listening on port ${port}`);
            });
            
            // Stop EventMonitor (on-demand ingest代替)
            // 默认不启动，避免误写入/丢块；如需临时回开可配置 EVENT_MONITOR_ENABLED=true
            const eventMonitorEnabled = process.env.EVENT_MONITOR_ENABLED === 'true';
            if (eventMonitorEnabled) {
                logger.info('Starting event monitor...');
                this.eventMonitor.setNodeLevelService(this.nodeLevelService);
                await this.eventMonitor.start();
                logger.info('✅ Event monitor started');
                
                // Start WebSocket event monitor (实时监听)
                logger.info('Starting WebSocket event monitor...');
                if (this.wsEventMonitor) {
                    await this.wsEventMonitor.start();
                    logger.info('✅ WebSocket event monitor started');
                } else {
                    logger.warn('⚠️ WebSocket event monitor not enabled');
                }
            } else {
                logger.warn('EventMonitor disabled (EVENT_MONITOR_ENABLED!=true)');
            }
            
            // Start approval monitor
            logger.info('Starting approval monitor...');
            await this.approvalMonitor.start();
            logger.info('✅ Approval monitor started');
            
            // Start scheduler
            logger.info('Starting scheduler...');
            this.schedulerService.start();
            logger.info('✅ Scheduler started');
            
            // Start withdraw data sync service
            logger.info('Starting withdraw data sync service...');
            this.withdrawDataSyncService.start();
            logger.info('✅ Withdraw data sync service started');
            
            // Start user stats sync service
            logger.info('Starting user stats sync service...');
            this.userStatsSyncService.start();
            logger.info('✅ User stats sync service started');

            // Start tx ingest job service (EventMonitor replacement core)
            logger.info('Starting tx ingest job service...');
            await txIngestJobService.start();
            logger.info('✅ Tx ingest job service started');
            
            // Referral reward settlement is handled by SchedulerService (weekly job).
            // Recording referral rewards is handled inside EventMonitor when processing stake logs.
            
            logger.info('');
            logger.info('='.repeat(60));
            logger.info('🚀 Backend service is running');
            logger.info('='.repeat(60));
            logger.info('');
            
            // Log status
            this.logStatus();
            
        } catch (error) {
            logger.error('Failed to start backend service:', error);
            throw error;
        }
    }
    
    /**
     * Stop all services
     */
    async stop(): Promise<void> {
        logger.info('Stopping backend service...');
        
        try {
            // Stop HTTP server
            if (this.httpServer) {
                await new Promise<void>((resolve) => {
                    this.httpServer!.close(() => {
                        logger.info('✅ HTTP server stopped');
                        resolve();
                    });
                });
            }
            
            // Stop event monitor
            this.eventMonitor.stop();
            
            // Stop WebSocket event monitor
            if (this.wsEventMonitor) {
                await this.wsEventMonitor.stop();
            }
            
            // Stop approval monitor
            this.approvalMonitor.stop();
            
            // Stop scheduler
            this.schedulerService.stop();
            
            // Stop withdraw data sync service
            this.withdrawDataSyncService.stop();

            // Stop tx ingest job service
            txIngestJobService.stop();
            
            // Referral reward settlement is handled by SchedulerService (weekly job).
            
            // Disconnect price oracle
            await this.priceOracleService.disconnect();
            
            // Close database pool
            await closePool();
            
            logger.info('✅ Backend service stopped');
            
        } catch (error) {
            logger.error('Error stopping backend service:', error);
            throw error;
        }
    }
    
    /**
     * Log current status
     */
    private logStatus(): void {
        const eventMonitorStatus = this.eventMonitor.getStatus();
        const schedulerStatus = this.schedulerService.getStatus();
        
        logger.info('Service Status:');
        logger.info(`  HTTP Server: ✅ Running on port ${process.env.PORT || '3001'}`);
        logger.info(`  Event Monitor: ${eventMonitorStatus.isRunning ? '✅ Running' : '❌ Stopped'}`);
        logger.info(`    - Last processed block: ${eventMonitorStatus.lastProcessedBlock}`);
        logger.info(`    - Confirmation blocks: ${eventMonitorStatus.confirmationBlocks}`);
        logger.info(`  Scheduler: ${schedulerStatus.running ? '✅ Running' : '❌ Stopped'}`);
        logger.info(`    - Active tasks: ${schedulerStatus.jobCount}`);
        logger.info('');
        logger.info('API Endpoints:');
        logger.info(`  GET  /health`);
        logger.info(`  GET  /api/user/:address`);
        logger.info(`  GET  /api/stakes/:address`);
        logger.info(`  GET  /api/rewards/:address`);
        logger.info(`  GET  /api/referrals/:address`);
        logger.info(`  GET  /api/level-history/:address`);
        logger.info(`  GET  /api/stats/global`);
        logger.info(`  GET  /api/price/rwa`);
        logger.info('');
    }
}

// Main execution
const service = new BackendService();

// Start service
service.start().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await service.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await service.stop();
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

export default service;
