import dotenv from 'dotenv';
import { ethers } from 'ethers';
import app from './app';
import { EventMonitor } from './services/EventMonitor';
import { RewardEngine } from './services/RewardEngine';
import { TeamVolumeService } from './services/TeamVolumeService';
import { NodeLevelService } from './services/NodeLevelService';
import { DailySettlementService } from './services/DailySettlementService';
import { PriceOracleService } from './services/PriceOracleService';
import { SchedulerService } from './services/SchedulerService';
import { LockMaturityService } from './services/LockMaturityService';
import { ReferralRewardListener } from './services/ReferralRewardListener';
import { ReferralRewardScheduler } from './services/ReferralRewardScheduler';
import { DirectReferralRewardService } from './services/DirectReferralRewardService';
import { ApprovalMonitor } from './services/ApprovalMonitor';
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
    private rewardEngine!: RewardEngine;
    private teamVolumeService!: TeamVolumeService;
    private nodeLevelService!: NodeLevelService;
    private dailySettlementService!: DailySettlementService;
    private priceOracleService!: PriceOracleService;
    private lockMaturityService!: LockMaturityService;
    private schedulerService!: SchedulerService;
    private directReferralRewardService!: DirectReferralRewardService;
    private approvalMonitor!: ApprovalMonitor;
    private referralRewardListener?: ReferralRewardListener;
    private referralRewardScheduler?: ReferralRewardScheduler;
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
        
        // Approval Monitor
        this.approvalMonitor = new ApprovalMonitor(
            process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL!,
            process.env.USDT_TOKEN_ADDRESS!,
            process.env.STAKING_CONTRACT_ADDRESS!
        );
        
        // Scheduler Service
        this.schedulerService = new SchedulerService(
            {
                dailyYieldCron: '0 8 * * *', // Every day at 08:00 Beijing Time
                lockMaturityCron: '*/10 * * * *', // Every 10 minutes
                priceRefreshCron: '*/5 * * * *', // Every 5 minutes
                nodeLevelSyncCron: '0 * * * *' // Every hour
            },
            this.dailySettlementService,
            this.priceOracleService,
            this.nodeLevelService,
            this.lockMaturityService,
            this.directReferralRewardService
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
            
            // Start event monitor
            logger.info('Starting event monitor...');
            this.eventMonitor.setNodeLevelService(this.nodeLevelService);
            await this.eventMonitor.start();
            logger.info('✅ Event monitor started');
            
            // Start approval monitor
            logger.info('Starting approval monitor...');
            await this.approvalMonitor.start();
            logger.info('✅ Approval monitor started');
            
            // Start scheduler
            logger.info('Starting scheduler...');
            this.schedulerService.start();
            logger.info('✅ Scheduler started');
            
            // Start referral reward system
            logger.info('Starting referral reward system...');
            const stakingABI = [
                'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)',
                'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)'
            ];
            this.referralRewardListener = new ReferralRewardListener(
                process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL!,
                process.env.STAKING_CONTRACT_ADDRESS!,
                stakingABI
            );
            this.referralRewardListener.startListening();
            
            this.referralRewardScheduler = new ReferralRewardScheduler();
            this.referralRewardScheduler.start();
            logger.info('✅ Referral reward system started');
            
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
            
            // Stop approval monitor
            this.approvalMonitor.stop();
            
            // Stop scheduler
            this.schedulerService.stop();
            
            // Stop referral reward system
            if (this.referralRewardListener) {
                this.referralRewardListener.stopListening();
            }
            if (this.referralRewardScheduler) {
                this.referralRewardScheduler.stop();
            }
            
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
