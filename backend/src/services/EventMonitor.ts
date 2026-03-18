import { ethers } from 'ethers';
import { query, transaction } from '../config/database.config';
import { Stake, EventProcessingState } from '../models/types';
import logger from '../utils/logger';
import { BalanceSnapshotService } from './BalanceSnapshotService';
import { DirectReferralRewardService } from './DirectReferralRewardService';
import { NodeLevelService } from './NodeLevelService';
import { UserStatsService } from './UserStatsService';

/**
 * Event Monitor Service
 * 
 * Monitors blockchain events from StakingContract
 * 
 * CRITICAL FEATURES:
 * 1. 12-block confirmation delay (prevent short-chain forks)
 * 2. Idempotency check (tx_hash uniqueness)
 * 3. Resume from last processed block (断点续传)
 * 4. Automatic retry on failure
 */

export interface EventMonitorConfig {
    rpcUrl: string;
    stakingContractAddress: string;
    confirmationBlocks: number;
    pollInterval: number; // milliseconds
}

export class EventMonitor {
    private rpcUrls: string[] = [];
    private providerIndex: number = 0;
    private rpcMaxAttempts: number = 4;
    private rpcRetryDelayMs: number = 400;
    private batchSize: number = 100;
    private provider: ethers.JsonRpcProvider;
    private stakingContract: ethers.Contract;
    private config: EventMonitorConfig;
    private isRunning: boolean = false;
    private lastProcessedBlock: number = 0;
    private snapshotService: BalanceSnapshotService;
    private referralRewardService: DirectReferralRewardService;
    private nodeLevelService: NodeLevelService | null = null;
    private userStatsService: UserStatsService;
    
    // StakingContract ABI (only events we need)
    private readonly STAKING_ABI = [
        'event StakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)',
        'event RWAStakeEvent(address indexed user, uint256 amount, address indexed referrer, uint256 indexed stakeId, uint256 timestamp, uint256 lockPeriod)',
        'event ReferralBound(address indexed user, address indexed referrer, uint256 timestamp)',
        'event RewardsUpdated(address indexed user, uint256 rwAmount, uint256 usdtAmount, uint256 indexed stakeId, uint256 timestamp)',
        'event NodeLevelUpdated(address indexed user, uint8 oldLevel, uint8 newLevel, uint256 timestamp)',
        'event WithdrawalRequested(address indexed user, uint256 amount, uint256 fee, uint256 timestamp)',
        'event USDTPrincipalWithdrawn(address indexed user, uint256 indexed lockIndex, uint256 grossAmount, uint256 netAmount, uint256 timestamp)',
        'event FlexibleUSDTPrincipalWithdrawn(address indexed user, uint256 grossAmount, uint256 netAmount, uint256 timestamp)',
        'event RWAPrincipalWithdrawn(address indexed user, uint256 indexed lockIndex, uint256 amount, uint256 timestamp)',
        'event FlexibleRWAPrincipalWithdrawn(address indexed user, uint256 amount, uint256 timestamp)',
        'event RWARewardWithdrawn(address indexed user, uint256 amount, uint256 fee, uint256 timestamp)',
        'event EmergencyWithdrawal(address indexed user, uint256 refundAmount, uint256 deductedRewards)',
        'function users(address) view returns (uint256 totalStaked, uint256 rwaPending, uint256 usdtRewards, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)',
        'function rwaStakes(address) view returns (uint256 totalStakedRWA, uint256 rwaPending, uint256 lastWithdrawTime, address referrer, uint256 firstStakeTime, uint8 nodeLevel, bool isActive)'
    ];
    
    constructor(config: EventMonitorConfig) {
        this.config = config;
        // RPC failover: BSC_RPC_URL (primary) + BSC_RPC_URLS (comma-separated backups)
        const fromEnv = (process.env.BSC_RPC_URLS || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const primary = (process.env.BSC_RPC_URL || config.rpcUrl || '').trim();
        const merged = [primary, ...fromEnv].filter(Boolean);
        this.rpcUrls = Array.from(new Set(merged.length ? merged : [config.rpcUrl]));
        this.providerIndex = 0;
        this.rpcMaxAttempts = parseInt(process.env.EVENT_MONITOR_RPC_MAX_ATTEMPTS || '4', 10);
        this.rpcRetryDelayMs = parseInt(process.env.EVENT_MONITOR_RPC_RETRY_DELAY_MS || '400', 10);
        this.batchSize = parseInt(process.env.EVENT_MONITOR_BATCH_SIZE || '100', 10);

        this.provider = new ethers.JsonRpcProvider(this.rpcUrls[this.providerIndex]);
        this.stakingContract = new ethers.Contract(
            config.stakingContractAddress,
            this.STAKING_ABI,
            this.provider
        );
        this.snapshotService = new BalanceSnapshotService();
        this.referralRewardService = new DirectReferralRewardService();
        this.userStatsService = new UserStatsService();

        logger.info(
            `[EventMonitor] RPC candidates=${this.rpcUrls.length}, primary=${this.rpcUrls[0]}` +
            (this.rpcUrls.length > 1 ? `, backups=${this.rpcUrls.slice(1).join(',')}` : '')
        );
    }

    private rotateProvider(reason?: string): void {
        if (this.rpcUrls.length <= 1) return;
        this.providerIndex = (this.providerIndex + 1) % this.rpcUrls.length;
        const nextUrl = this.rpcUrls[this.providerIndex];
        this.provider = new ethers.JsonRpcProvider(nextUrl);
        this.stakingContract = new ethers.Contract(
            this.config.stakingContractAddress,
            this.STAKING_ABI,
            this.provider
        );
        logger.warn(
            `[EventMonitor] Switched RPC to #${this.providerIndex + 1}/${this.rpcUrls.length}: ${nextUrl}` +
            (reason ? ` (${reason})` : '')
        );
    }

    private async withRpcFailover<T>(opName: string, fn: () => Promise<T>): Promise<T> {
        const attempts = Math.max(1, Number.isFinite(this.rpcMaxAttempts) ? this.rpcMaxAttempts : 4);
        let lastErr: any;
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (err: any) {
                lastErr = err;
                const msg = err?.message || String(err || '');
                const isRateLimit =
                    msg.includes('limit exceeded') ||
                    msg.includes('LimitExceeded') ||
                    msg.includes('429') ||
                    msg.includes('rate limit') ||
                    msg.includes('Too Many Requests');
                const isTimeout =
                    msg.includes('timeout') ||
                    msg.includes('ETIMEDOUT') ||
                    msg.includes('ECONNRESET') ||
                    msg.includes('ENOTFOUND') ||
                    msg.includes('502') ||
                    msg.includes('503') ||
                    msg.includes('504');

                if (this.rpcUrls.length > 1 && (isRateLimit || isTimeout)) {
                    this.rotateProvider(`${opName}: ${msg.slice(0, 120)}`);
                }
                const delay = Math.min(5000, this.rpcRetryDelayMs * Math.pow(2, i));
                logger.warn(`[EventMonitor] ${opName} failed (attempt ${i + 1}/${attempts}): ${msg}. Retrying in ${delay}ms`);
                await this.sleep(delay);
            }
        }
        throw lastErr;
    }
    
    setNodeLevelService(service: NodeLevelService): void {
        this.nodeLevelService = service;
    }
    
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Event monitor is already running');
            return;
        }
        
        this.isRunning = true;
        logger.info('Starting event monitor...');
        await this.loadLastProcessedBlock();
        this.pollEvents();
        logger.info(`Event monitor started. Polling interval: ${this.config.pollInterval}ms`);
    }
    
    stop(): void {
        this.isRunning = false;
        logger.info('Event monitor stopped');
    }
    
    private async loadLastProcessedBlock(): Promise<void> {
        try {
            const result = await query<EventProcessingState[]>(
                'SELECT last_processed_block FROM event_processing_state WHERE id = 1'
            );
            
            if (result.length > 0) {
                const stored = result[0].last_processed_block;
                const envStart =
                  process.env.EVENT_MONITOR_START_BLOCK != null
                    ? parseInt(process.env.EVENT_MONITOR_START_BLOCK, 10)
                    : NaN;
                const forceRewind =
                  String(process.env.EVENT_MONITOR_FORCE_REWIND || '').toLowerCase() === 'true';
                const forceSeek =
                  String(process.env.EVENT_MONITOR_FORCE_SEEK || '').toLowerCase() === 'true';

                // 默认行为：继续从 DB 断点续传
                // 若配置了 EVENT_MONITOR_START_BLOCK 且更早：
                // - forceRewind=true 时允许回退并重扫（主网首次部署/错过事件时使用）
                // - 否则仅打印提示，不自动回退，避免重复写库
                if (Number.isFinite(envStart) && envStart < stored) {
                  if (forceRewind) {
                    this.lastProcessedBlock = Math.max(0, envStart);
                    await query(
                      'INSERT INTO event_processing_state (id, last_processed_block) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_processed_block = VALUES(last_processed_block)',
                      [this.lastProcessedBlock]
                    );
                    logger.warn(
                      `EventMonitor rewind enabled. Rewinding from stored=${stored} to envStart=${this.lastProcessedBlock}`
                    );
                  } else {
                    this.lastProcessedBlock = stored;
                    logger.info(
                      `Resuming from block ${this.lastProcessedBlock} (envStart=${envStart} ignored; set EVENT_MONITOR_FORCE_REWIND=true to rewind)`
                    );
                  }
                } else if (Number.isFinite(envStart) && envStart > stored && forceSeek) {
                  // 快速“跳到”更靠后的起始块（用于立刻让最近交易显示；不会补旧历史）
                  this.lastProcessedBlock = Math.max(0, envStart);
                  await query(
                    'INSERT INTO event_processing_state (id, last_processed_block) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_processed_block = VALUES(last_processed_block)',
                    [this.lastProcessedBlock]
                  );
                  logger.warn(
                    `EventMonitor force seek enabled. Seeking from stored=${stored} to envStart=${this.lastProcessedBlock}`
                  );
                } else {
                  this.lastProcessedBlock = stored;
                  logger.info(`Resuming from block ${this.lastProcessedBlock}`);
                }
            } else {
                const current = await this.withRpcFailover('getBlockNumber', () => this.provider.getBlockNumber());
                const envStart =
                  process.env.EVENT_MONITOR_START_BLOCK != null
                    ? parseInt(process.env.EVENT_MONITOR_START_BLOCK, 10)
                    : NaN;
                const lookback =
                  process.env.EVENT_MONITOR_LOOKBACK_BLOCKS != null
                    ? parseInt(process.env.EVENT_MONITOR_LOOKBACK_BLOCKS, 10)
                    : 20000; // ~ 16-20 hours on BSC, enough to cover recent deploy/test

                const startBlock = Number.isFinite(envStart)
                  ? Math.max(0, envStart)
                  : Math.max(0, current - (Number.isFinite(lookback) ? lookback : 20000));

                // Ensure state row exists so UPDATE works later
                await query(
                  'INSERT INTO event_processing_state (id, last_processed_block) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_processed_block = last_processed_block',
                  [startBlock]
                );

                this.lastProcessedBlock = startBlock;
                logger.info(`Starting from block ${this.lastProcessedBlock} (current=${current}, lookback=${lookback}, envStart=${process.env.EVENT_MONITOR_START_BLOCK || 'n/a'})`);
            }
        } catch (error) {
            logger.error('Failed to load last processed block:', error);
            throw error;
        }
    }
    
    private async saveLastProcessedBlock(blockNumber: number): Promise<void> {
        try {
            await query(
                'INSERT INTO event_processing_state (id, last_processed_block) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_processed_block = VALUES(last_processed_block)',
                [blockNumber]
            );
            this.lastProcessedBlock = blockNumber;
        } catch (error) {
            logger.error('Failed to save last processed block:', error);
            throw error;
        }
    }
    
    private async pollEvents(): Promise<void> {
        while (this.isRunning) {
            try {
                await this.processNewBlocks();
            } catch (error) {
                logger.error('Error processing blocks:', error);
            }
            await this.sleep(this.config.pollInterval);
        }
    }
    
    private async processNewBlocks(): Promise<void> {
        const currentBlock = await this.withRpcFailover('getBlockNumber', () => this.provider.getBlockNumber());
        const confirmedBlock = currentBlock - this.config.confirmationBlocks;
        
        if (confirmedBlock <= this.lastProcessedBlock) {
            return;
        }
        
        logger.info(`Processing blocks ${this.lastProcessedBlock + 1} to ${confirmedBlock}`);
        
        const batchSize = Math.max(10, Number.isFinite(this.batchSize) ? this.batchSize : 100);
        for (let fromBlock = this.lastProcessedBlock + 1; fromBlock <= confirmedBlock; fromBlock += batchSize) {
            const toBlock = Math.min(fromBlock + batchSize - 1, confirmedBlock);
            await this.processBlockRange(fromBlock, toBlock);
            await this.saveLastProcessedBlock(toBlock);
        }
    }
    
    private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
        // 获取区块范围内的所有交易
        const contractAddress = await this.stakingContract.getAddress();
        const logs = await this.withRpcFailover('getLogs', () =>
            this.provider.getLogs({
                address: contractAddress,
                fromBlock,
                toBlock
            })
        );
        
        logger.info(`Found ${logs.length} log(s) in blocks ${fromBlock}-${toBlock}`);
        
        // 手动解析每个日志
        const stakeEventTopic = this.stakingContract.interface.getEvent('StakeEvent')!.topicHash;
        const rwaStakeEventTopic = this.stakingContract.interface.getEvent('RWAStakeEvent')!.topicHash;
        
        let stakeCount = 0;
        let rwaStakeCount = 0;
        
        for (const log of logs) {
            try {
                if (log.topics[0] === stakeEventTopic) {
                    const parsed = this.stakingContract.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    if (parsed) {
                        await this.handleStakeEvent({
                            ...log,
                            args: parsed.args,
                            eventName: 'StakeEvent'
                        } as any);
                        stakeCount++;
                    }
                } else if (log.topics[0] === rwaStakeEventTopic) {
                    const parsed = this.stakingContract.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    if (parsed) {
                        await this.handleRWAStakeEvent({
                            ...log,
                            args: parsed.args,
                            eventName: 'RWAStakeEvent'
                        } as any);
                        rwaStakeCount++;
                    }
                }
                // 忽略其他事件
            } catch (error) {
                // 只记录匹配topic但解析失败的日志
                if (log.topics[0] === stakeEventTopic || log.topics[0] === rwaStakeEventTopic) {
                    logger.error(`Failed to parse log: ${error}`);
                }
            }
        }
        
        logger.info(`Processed ${stakeCount} StakeEvent(s) and ${rwaStakeCount} RWAStakeEvent(s)`);

        const withdrawalEvents = await this.withRpcFailover('queryFilter WithdrawalRequested', () =>
            this.stakingContract.queryFilter(
                this.stakingContract.filters.WithdrawalRequested(),
                fromBlock,
                toBlock
            )
        );
        for (const event of withdrawalEvents) {
            await this.handleRewardWithdrawal(event as ethers.EventLog);
        }

        const rwaRewardWithdrawnEvents = await this.withRpcFailover('queryFilter RWARewardWithdrawn', () =>
            this.stakingContract.queryFilter(
                this.stakingContract.filters.RWARewardWithdrawn(),
                fromBlock,
                toBlock
            )
        );
        for (const event of rwaRewardWithdrawnEvents) {
            await this.handleRWARewardWithdrawal(event as ethers.EventLog);
        }

        const flexibleUsdtWithdrawEvents = await this.withRpcFailover('queryFilter FlexibleUSDTPrincipalWithdrawn', () =>
            this.stakingContract.queryFilter(
                this.stakingContract.filters.FlexibleUSDTPrincipalWithdrawn(),
                fromBlock,
                toBlock
            )
        );
        for (const event of flexibleUsdtWithdrawEvents) {
            await this.handlePrincipalStateSync(event as ethers.EventLog, 'FlexibleUSDTPrincipalWithdrawn');
        }

        const usdtPrincipalWithdrawEvents = await this.withRpcFailover('queryFilter USDTPrincipalWithdrawn', () =>
            this.stakingContract.queryFilter(
                this.stakingContract.filters.USDTPrincipalWithdrawn(),
                fromBlock,
                toBlock
            )
        );
        for (const event of usdtPrincipalWithdrawEvents) {
            await this.handlePrincipalStateSync(event as ethers.EventLog, 'USDTPrincipalWithdrawn');
        }

        const flexibleRwaWithdrawEvents = await this.withRpcFailover('queryFilter FlexibleRWAPrincipalWithdrawn', () =>
            this.stakingContract.queryFilter(
                this.stakingContract.filters.FlexibleRWAPrincipalWithdrawn(),
                fromBlock,
                toBlock
            )
        );
        for (const event of flexibleRwaWithdrawEvents) {
            await this.handlePrincipalStateSync(event as ethers.EventLog, 'FlexibleRWAPrincipalWithdrawn');
        }

        const rwaPrincipalWithdrawEvents = await this.withRpcFailover('queryFilter RWAPrincipalWithdrawn', () =>
            this.stakingContract.queryFilter(
                this.stakingContract.filters.RWAPrincipalWithdrawn(),
                fromBlock,
                toBlock
            )
        );
        for (const event of rwaPrincipalWithdrawEvents) {
            await this.handlePrincipalStateSync(event as ethers.EventLog, 'RWAPrincipalWithdrawn');
        }

        const emergencyWithdrawEvents = await this.withRpcFailover('queryFilter EmergencyWithdrawal', () =>
            this.stakingContract.queryFilter(
                this.stakingContract.filters.EmergencyWithdrawal(),
                fromBlock,
                toBlock
            )
        );
        for (const event of emergencyWithdrawEvents) {
            await this.handlePrincipalStateSync(event as ethers.EventLog, 'EmergencyWithdrawal');
        }
    }
    
    private async handleStakeEvent(event: ethers.EventLog): Promise<void> {
        try {
            const { user, amount, referrer, stakeId, timestamp, lockPeriod } = event.args as any;
            const txHash = event.transactionHash;
            const blockNumber = event.blockNumber;
            
            // 输入验证
            this.validateStakeParams(timestamp, amount, lockPeriod);
            
            logger.info(`Processing StakeEvent: user=${user}, stakeId=${stakeId}, tx=${txHash}`);
            
            const existing = await query<Stake[]>(
                'SELECT stake_id FROM stake_events WHERE tx_hash = ?',
                [txHash]
            );
            
            if (existing.length > 0) {
                logger.warn(`StakeEvent already processed: tx=${txHash}, skipping`);
                return;
            }
            
            await transaction(async (connection) => {
                await connection.query(
                    `INSERT IGNORE INTO stake_events (stake_id, user_address, amount, lock_period, event_type, referrer_address, tx_hash, block_number, timestamp)
                     VALUES (?, ?, ?, ?, 'USDT', ?, ?, ?, ?)`,
                    [
                        stakeId.toString(),
                        user.toLowerCase(),
                        amount.toString(),
                        lockPeriod?.toString() || '0',
                        referrer !== ethers.ZeroAddress ? referrer.toLowerCase() : null,
                        txHash,
                        blockNumber,
                        timestamp.toString()
                    ]
                );
                
                // 如果是锁仓质押，插入locked_stakes表
                const lockPeriodNum = Number(lockPeriod?.toString() || '0');
                if (lockPeriodNum > 0) {
                    const lockEndTime = Number(timestamp.toString()) + (lockPeriodNum * 86400);
                    await connection.query(
                        `INSERT IGNORE INTO locked_stakes (stake_id, user_address, amount, is_rwa_stake, lock_period, lock_end_time, is_withdrawn, block_number, transaction_hash)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            stakeId.toString(),
                            user.toLowerCase(),
                            amount.toString(),
                            0, // USDT
                            lockPeriodNum,
                            lockEndTime,
                            0,
                            blockNumber,
                            txHash
                        ]
                    );
                }
                
                // 更新cumulative_personal_stake（USDT转18位精度）
                const usdtAmount18 = BigInt(amount.toString()) * BigInt(1e12);
                await connection.query(
                    `INSERT INTO users (address, cumulative_personal_stake, node_level) 
                     VALUES (?, ?, 1)
                     ON DUPLICATE KEY UPDATE 
                     cumulative_personal_stake = cumulative_personal_stake + ?`,
                    [user.toLowerCase(), usdtAmount18.toString(), usdtAmount18.toString()]
                );
                
                if (referrer !== ethers.ZeroAddress) {
                    await this.bindReferralRelationship(connection, user.toLowerCase(), referrer.toLowerCase());
                }
            });
            
            logger.info(`✅ StakeEvent processed: stakeId=${stakeId}, lockPeriod=${lockPeriod}`);
            
            // 记录余额快照
            await this.snapshotService.recordStakeSnapshot(
                user.toLowerCase(),
                'USDT',
                amount.toString(),
                Number(lockPeriod?.toString() || '0'),
                Number(timestamp.toString()),
                txHash
            );
            
            // 记录USDT推荐奖励
            // 检查是否有RWA质押记录，如果有说明是RWA质押触发的StakeEvent，跳过
            if (referrer !== ethers.ZeroAddress && Number(lockPeriod?.toString() || '0') >= 30) {
                try {
                    const [rwaRecord] = await query(
                        'SELECT id FROM stake_events WHERE stake_id = ? AND event_type = ?',
                        [stakeId.toString(), 'RWA']
                    ) as any[];
                    
                    if (!rwaRecord) {
                        // 没有RWA记录，说明是纯USDT质押
                        await this.referralRewardService.recordReferralReward(
                            referrer.toLowerCase(),
                            user.toLowerCase(),
                            Number(stakeId.toString()),
                            amount.toString(),
                            'USDT',
                            new Date(Number(timestamp.toString()) * 1000),
                            Number(lockPeriod?.toString() || '0')
                        );
                    }
                } catch (error) {
                    logger.error(`Failed to record USDT referral reward: ${error}`);
                }
            }
            
            await this.updateTeamDeposited(user.toLowerCase(), amount.toString());
            
            await this.updateTeamDeposited(user.toLowerCase(), amount.toString());
            
            this.triggerRewardCalculation(user.toLowerCase(), amount.toString(), stakeId.toString(), 'USDT', Number(lockPeriod?.toString() ?? 0) > 0)
                .catch(error => {
                    logger.error(`Failed to trigger reward calculation for stakeId=${stakeId}:`, error);
                });
            
            // 检查等级升级
            if (this.nodeLevelService) {
                try {
                    await this.nodeLevelService.checkAndUpgradeNodeLevel(user.toLowerCase());
                } catch (error) {
                    logger.error(`Failed to check node level upgrade for ${user}:`, error);
                }
            }
            
            // 更新 user_stats 表（实时同步）
            try {
                await this.userStatsService.onStakeEvent(
                    user.toLowerCase(),
                    BigInt(amount.toString()),
                    'USDT',
                    referrer !== ethers.ZeroAddress ? referrer.toLowerCase() : undefined
                );
                logger.info(`✅ user_stats updated for ${user}`);
            } catch (error) {
                logger.error(`Failed to update user_stats for ${user}:`, error);
            }
            
        } catch (error) {
            logger.error('Failed to handle StakeEvent:', error);
            throw error;
        }
    }
    
    private async handleRWAStakeEvent(event: ethers.EventLog): Promise<void> {
        try {
            const { user, amount, referrer, stakeId, timestamp, lockPeriod } = event.args as any;
            const txHash = event.transactionHash;
            const blockNumber = event.blockNumber;
            
            // 输入验证
            this.validateStakeParams(timestamp, amount, lockPeriod);
            
            logger.info(`Processing RWAStakeEvent: user=${user}, stakeId=${stakeId}, tx=${txHash}`);
            
            const existing = await query<Stake[]>(
                'SELECT stake_id FROM stake_events WHERE tx_hash = ?',
                [txHash]
            );
            
            if (existing.length > 0) {
                logger.warn(`RWAStakeEvent already processed: tx=${txHash}, skipping`);
                return;
            }
            
            await transaction(async (connection) => {
                await connection.query(
                    `INSERT IGNORE INTO stake_events (stake_id, user_address, amount, lock_period, event_type, referrer_address, tx_hash, block_number, timestamp)
                     VALUES (?, ?, ?, ?, 'RWA', ?, ?, ?, ?)`,
                    [
                        stakeId.toString(),
                        user.toLowerCase(),
                        amount.toString(),
                        lockPeriod?.toString() || '0',
                        referrer !== ethers.ZeroAddress ? referrer.toLowerCase() : null,
                        txHash,
                        blockNumber,
                        timestamp.toString()
                    ]
                );

                // 如果是锁仓质押，插入locked_stakes表
                const lockPeriodNum = Number(lockPeriod?.toString() || '0');
                if (lockPeriodNum > 0) {
                    const lockEndTime = Number(timestamp.toString()) + (lockPeriodNum * 86400);
                    await connection.query(
                        `INSERT IGNORE INTO locked_stakes (stake_id, user_address, amount, is_rwa_stake, lock_period, lock_end_time, is_withdrawn, block_number, transaction_hash)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            stakeId.toString(),
                            user.toLowerCase(),
                            amount.toString(),
                            1, // RWA
                            lockPeriodNum,
                            lockEndTime,
                            0,
                            blockNumber,
                            txHash
                        ]
                    );
                }

                const contractAmount = BigInt(amount.toString()) / 2n;
                
                // 更新cumulative_personal_stake（RWA转USDT等值，18位精度）
                const rwaToUsdt18 = (BigInt(amount.toString()) * 85n) / 100n;
                await connection.query(
                    `INSERT INTO users (address, cumulative_personal_stake, node_level) 
                     VALUES (?, ?, 1)
                     ON DUPLICATE KEY UPDATE 
                     cumulative_personal_stake = cumulative_personal_stake + ?`,
                    [user.toLowerCase(), rwaToUsdt18.toString(), rwaToUsdt18.toString()]
                );
                
                await connection.query(
                    `INSERT INTO rwa_stakes (
                        user_address, total_staked_rwa, referrer, 
                        first_stake_time, node_level, is_active
                    ) VALUES (?, ?, ?, ?, 1, TRUE)
                    ON DUPLICATE KEY UPDATE
                        total_staked_rwa = total_staked_rwa + ?,
                        referrer = COALESCE(referrer, ?),
                        first_stake_time = COALESCE(first_stake_time, ?)`,
                    [
                        user.toLowerCase(),
                        amount.toString(),
                        referrer !== ethers.ZeroAddress ? referrer.toLowerCase() : null,
                        timestamp.toString(),
                        amount.toString(),
                        referrer !== ethers.ZeroAddress ? referrer.toLowerCase() : null,
                        timestamp.toString()
                    ]
                );
                
                if (lockPeriod && lockPeriod > 0) {
                    const lockEndTime = BigInt(timestamp.toString()) + (BigInt(lockPeriod.toString()) * 86400n);
                    await connection.query(
                        `INSERT INTO rwa_locked_principals (
                            user_address, stake_id, principal_amount,
                            lock_start_time, lock_end_time, lock_period
                        ) VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            user.toLowerCase(),
                            stakeId.toString(),
                            contractAmount.toString(),
                            timestamp.toString(),
                            lockEndTime.toString(),
                            lockPeriod.toString()
                        ]
                    );
                }
                
                if (referrer !== ethers.ZeroAddress) {
                    await this.bindReferralRelationship(connection, user.toLowerCase(), referrer.toLowerCase());
                }
            });
            
            logger.info(`✅ RWAStakeEvent processed: stakeId=${stakeId}, lockPeriod=${lockPeriod}`);
            
            // 记录余额快照
            await this.snapshotService.recordStakeSnapshot(
                user.toLowerCase(),
                'RWA',
                amount.toString(),
                Number(lockPeriod?.toString() || '0'),
                Number(timestamp.toString()),
                txHash
            );
            
            // 记录推荐奖励（RWA质押使用原始RWA金额）
            if (referrer !== ethers.ZeroAddress && Number(lockPeriod?.toString() || '0') >= 30) {
                try {
                    await this.referralRewardService.recordReferralReward(
                        referrer.toLowerCase(),
                        user.toLowerCase(),
                        Number(stakeId.toString()),
                        amount.toString(),
                        'RWA',
                        new Date(Number(timestamp.toString()) * 1000),
                        Number(lockPeriod?.toString() || '0')
                    );
                } catch (error) {
                    logger.error(`Failed to record referral reward: ${error}`);
                }
            }
            
            const rwaToUsdtForRetained = (BigInt(amount.toString()) * 85n / 100n).toString();
            await this.updateTeamDeposited(user.toLowerCase(), rwaToUsdtForRetained);
            
            this.triggerRewardCalculation(user.toLowerCase(), amount.toString(), stakeId.toString(), 'RWA', Number(lockPeriod?.toString() ?? 0) > 0)
                .catch(error => {
                    logger.error(`Failed to trigger reward calculation for stakeId=${stakeId}:`, error);
                });
            
            // 检查等级升级
            if (this.nodeLevelService) {
                try {
                    await this.nodeLevelService.checkAndUpgradeNodeLevel(user.toLowerCase());
                } catch (error) {
                    logger.error(`Failed to check node level upgrade for ${user}:`, error);
                }
            }
            
            // 更新 user_stats 表（实时同步）
            try {
                await this.userStatsService.onStakeEvent(
                    user.toLowerCase(),
                    BigInt(amount.toString()),
                    'RWA',
                    referrer !== ethers.ZeroAddress ? referrer.toLowerCase() : undefined
                );
                logger.info(`✅ user_stats updated for ${user} (RWA)`);
            } catch (error) {
                logger.error(`Failed to update user_stats for ${user}:`, error);
            }
            
        } catch (error) {
            logger.error('Failed to handle RWAStakeEvent:', error);
            throw error;
        }
    }

    private async handleRewardWithdrawal(event: ethers.EventLog): Promise<void> {
        const { user, amount, timestamp } = event.args as any;
        const txHash = event.transactionHash;
        logger.info(`Processing WithdrawalRequested for user=${user}, tx=${txHash}`);
        const usdtEquiv = (BigInt(amount?.toString() ?? '0') * 85n / 100n).toString();
        await this.recordTeamWithdrawnAndSync(user.toLowerCase(), txHash, usdtEquiv, 'USDT', 'WITHDRAWAL_REQUESTED', Number(timestamp), event.blockNumber);
        await this.syncUserState(user.toLowerCase());
    }

    private async handleRWARewardWithdrawal(event: ethers.EventLog): Promise<void> {
        const { user, amount, timestamp } = event.args as any;
        const txHash = event.transactionHash;
        logger.info(`Processing RWARewardWithdrawn for user=${user}, tx=${txHash}`);
        const usdtEquiv = (BigInt(amount?.toString() ?? '0') * 85n / 100n).toString();
        await this.recordTeamWithdrawnAndSync(user.toLowerCase(), txHash, usdtEquiv, 'USDT', 'RWA_REWARD_WITHDRAWN', Number(timestamp), event.blockNumber);
        await this.syncRWAStakeState(user.toLowerCase());
    }

    private async handlePrincipalStateSync(event: ethers.EventLog, eventName: string): Promise<void> {
        const args = event.args as any;
        const user = args?.user?.toLowerCase?.() ?? args?.user;
        const txHash = event.transactionHash;
        logger.info(`Processing ${eventName} for user=${user}, tx=${txHash}`);
        const amountUsdtEquiv = this.getWithdrawalAmountUsdtEquiv(eventName, args);
        await this.recordTeamWithdrawnAndSync(user, txHash, amountUsdtEquiv, 'USDT', eventName, Number(args.timestamp || 0), event.blockNumber);
        
        // 记录提现快照
        const assetType = eventName.includes('RWA') ? 'RWA' : 'USDT';
        const amount = eventName.includes('Flexible') 
            ? (args.grossAmount?.toString() || args.amount?.toString() || '0')
            : (args.grossAmount?.toString() || args.amount?.toString() || '0');
        
        await this.snapshotService.recordWithdrawSnapshot(
            user,
            assetType,
            amount,
            !eventName.includes('Flexible'),
            Number(args.timestamp || 0),
            txHash
        );
        
        // 更新 user_stats 表（实时同步）
        try {
            let withdrawAmount = BigInt(amount);
            let withdrawAssetType: 'USDT' | 'RWA' = assetType as 'USDT' | 'RWA';
            
            // RWA提现需要从USDT等值转换回RWA
            if (assetType === 'RWA') {
                const amountUsdtEquivBigInt = BigInt(amountUsdtEquiv);
                withdrawAmount = (amountUsdtEquivBigInt * 100n) / 85n; // USDT等值转RWA
            }
            
            await this.userStatsService.onWithdrawEvent(
                user,
                withdrawAmount,
                withdrawAssetType
            );
            logger.info(`✅ user_stats updated for ${user} (${withdrawAssetType} withdraw)`);
        } catch (error) {
            logger.error(`Failed to update user_stats for ${user}:`, error);
        }
        
        await this.syncUserState(user);
        await this.syncRWAStakeState(user);
    }

    private getWithdrawalAmountUsdtEquiv(eventName: string, args: any): string {
        if (!args) return '0';
        const FEE_RATE_92 = 92n;
        const RWA_TO_USDT_85 = 85n;
        const HUNDRED = 100n;
        switch (eventName) {
            case 'FlexibleUSDTPrincipalWithdrawn':
            case 'USDTPrincipalWithdrawn':
                return (args.grossAmount?.toString?.() ?? args.grossAmount ?? '0').toString();
            case 'FlexibleRWAPrincipalWithdrawn': {
                const netRwa = BigInt((args.amount?.toString?.() ?? args.amount ?? '0').toString());
                const grossRwa = (netRwa * HUNDRED) / FEE_RATE_92;
                return (grossRwa * RWA_TO_USDT_85 / HUNDRED).toString();
            }
            case 'RWAPrincipalWithdrawn': {
                const amt = BigInt((args.amount?.toString?.() ?? args.amount ?? '0').toString());
                const grossRwa = (amt * HUNDRED) / FEE_RATE_92;
                return (grossRwa * RWA_TO_USDT_85 / HUNDRED).toString();
            }
            case 'EmergencyWithdrawal': {
                const netUsdt = BigInt((args.refundAmount?.toString?.() ?? args.refundAmount ?? '0').toString());
                const grossUsdt = (netUsdt * HUNDRED) / FEE_RATE_92;
                return grossUsdt.toString();
            }
            default:
                return '0';
        }
    }

    private async recordTeamWithdrawnAndSync(
        userAddress: string,
        txHash: string,
        amountUsdtEquiv: string,
        _token: string,
        eventType: string,
        timestamp: number,
        blockNumber: number
    ): Promise<void> {
        const existing = await query<{ tx_hash: string }[]>(
            'SELECT tx_hash FROM withdrawal_events WHERE tx_hash = ?',
            [txHash]
        );
        if (existing.length > 0) return;
        const { TeamVolumeService } = await import('./TeamVolumeService');
        const svc = new TeamVolumeService();
        await transaction(async (conn) => {
            await conn.query(
                'INSERT IGNORE INTO withdrawal_events (user_address, event_type, amount, stake_id, timestamp, block_number, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userAddress, eventType, amountUsdtEquiv, 0, timestamp, blockNumber, txHash]
            );
        });
        await svc.updateTeamWithdrawn(userAddress, amountUsdtEquiv);
    }

    private async updateTeamDeposited(userAddress: string, amountUsdtEquiv: string): Promise<void> {
        const { TeamVolumeService } = await import('./TeamVolumeService');
        const svc = new TeamVolumeService();
        await svc.updateTeamDeposited(userAddress, amountUsdtEquiv);
    }

    private async syncUserState(userAddress: string): Promise<void> {
        const userInfo = await this.stakingContract.users(userAddress);
        const lastWithdrawTime = Number(userInfo[3]) > 0 ? Number(userInfo[3]) : null;
        const firstStakeTime = Number(userInfo[5]) > 0 ? Number(userInfo[5]) : null;
        const referrer = userInfo[4] !== ethers.ZeroAddress ? userInfo[4].toLowerCase() : null;

        await query(
            `INSERT INTO users (
                address, total_staked, rwa_pending, usdt_rewards, last_withdraw_time,
                referrer, first_stake_time, node_level, is_active
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                total_staked = VALUES(total_staked),
                rwa_pending = VALUES(rwa_pending),
                usdt_rewards = VALUES(usdt_rewards),
                last_withdraw_time = VALUES(last_withdraw_time),
                referrer = COALESCE(users.referrer, VALUES(referrer)),
                first_stake_time = COALESCE(users.first_stake_time, VALUES(first_stake_time)),
                node_level = VALUES(node_level),
                is_active = VALUES(is_active)`,
            [
                userAddress,
                userInfo[0].toString(),
                userInfo[1].toString(),
                userInfo[2].toString(),
                lastWithdrawTime ? new Date(lastWithdrawTime * 1000) : null,
                referrer,
                firstStakeTime ? new Date(firstStakeTime * 1000) : null,
                Number(userInfo[6]),
                Boolean(userInfo[7]),
            ]
        );
    }

    private async syncRWAStakeState(userAddress: string): Promise<void> {
        const rwaStakeInfo = await this.stakingContract.rwaStakes(userAddress);
        const totalStakedRWA = rwaStakeInfo[0].toString();
        const rwaPending = rwaStakeInfo[1].toString();
        const lastWithdrawTime = Number(rwaStakeInfo[2]) > 0 ? Number(rwaStakeInfo[2]) : null;
        const referrer = rwaStakeInfo[3] !== ethers.ZeroAddress ? rwaStakeInfo[3].toLowerCase() : null;
        const firstStakeTime = Number(rwaStakeInfo[4]) > 0 ? Number(rwaStakeInfo[4]) : null;

        await query(
            `INSERT INTO rwa_stakes (
                user_address, total_staked_rwa, rwa_pending, last_withdraw_time,
                referrer, first_stake_time, node_level, is_active
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                total_staked_rwa = VALUES(total_staked_rwa),
                rwa_pending = VALUES(rwa_pending),
                last_withdraw_time = VALUES(last_withdraw_time),
                referrer = COALESCE(rwa_stakes.referrer, VALUES(referrer)),
                first_stake_time = COALESCE(rwa_stakes.first_stake_time, VALUES(first_stake_time)),
                node_level = VALUES(node_level),
                is_active = VALUES(is_active)`,
            [
                userAddress,
                totalStakedRWA,
                rwaPending,
                lastWithdrawTime ?? 0,
                referrer,
                firstStakeTime ?? 0,
                Number(rwaStakeInfo[5]),
                Boolean(rwaStakeInfo[6]),
            ]
        );
    }
    
    private async bindReferralRelationship(
        connection: any,
        userAddress: string,
        referrerAddress: string
    ): Promise<void> {
        if (!userAddress || !referrerAddress || userAddress === referrerAddress) {
            logger.warn(`Skipping invalid referral binding: ${userAddress} -> ${referrerAddress}`);
            return;
        }

        const [existing] = await connection.query(
            'SELECT referrer FROM users WHERE address = ?',
            [userAddress]
        );
        
        if (existing.length > 0 && existing[0].referrer) {
            if (existing[0].referrer !== referrerAddress) {
                logger.warn(
                    `Referrer mismatch for ${userAddress}: db=${existing[0].referrer}, event=${referrerAddress}. Keeping existing referrer.`
                );
            } else {
                logger.info(`Referrer already set for ${userAddress}, skipping`);
            }
            return;
        }
        
        await connection.query(
            'UPDATE users SET referrer = ? WHERE address = ?',
            [referrerAddress, userAddress]
        );
        
        await connection.query(
            'CALL sp_build_referral_relations(?, ?)',
            [userAddress, referrerAddress]
        );
        
        await connection.query(
            'UPDATE users SET direct_referral_count = direct_referral_count + 1 WHERE address = ?',
            [referrerAddress]
        );
        
        logger.info(`✅ Referral relationship bound: ${userAddress} -> ${referrerAddress}`);
    }
    
    private async triggerRewardCalculation(
        userAddress: string,
        amount: string,
        stakeId: string,
        assetType: 'USDT' | 'RWA' = 'USDT',
        isLocked: boolean = false
    ): Promise<void> {
        logger.info(`Triggering reward calculation for user=${userAddress}, stakeId=${stakeId}, assetType=${assetType}, isLocked=${isLocked}`);
        
        const { RewardEngine } = await import('./RewardEngine');
        const { TeamVolumeService } = await import('./TeamVolumeService');
        const { NodeLevelService } = await import('./NodeLevelService');
        
        try {
            if (isLocked) {
                const teamVolumeService = new TeamVolumeService();
                const amountForTeam = assetType === 'RWA'
                    ? (BigInt(amount) * 85n / 100n).toString()
                    : amount;
                await teamVolumeService.updateTeamVolume(userAddress, amountForTeam);
            }
            
            const rewardEngine = new RewardEngine({
                stakingContractAddress: this.config.stakingContractAddress,
                stakingContractABI: this.STAKING_ABI,
                provider: this.provider,
                backendWallet: new ethers.Wallet(
                    process.env.BACKEND_PRIVATE_KEY!,
                    this.provider
                ),
                maxRewardPerCall: process.env.MAX_REWARD_PER_CALL || '10000000000000000000000'
            });
            
            await rewardEngine.processStake(userAddress, amount, stakeId, assetType);
            
            const nodeLevelService = new NodeLevelService({
                stakingContractAddress: this.config.stakingContractAddress,
                stakingContractABI: this.STAKING_ABI,
                provider: this.provider,
                backendWallet: new ethers.Wallet(
                    process.env.BACKEND_PRIVATE_KEY!,
                    this.provider
                )
            });
            
            await nodeLevelService.checkAndUpgradeNodeLevel(userAddress);
            
            const ancestors = await query<any[]>(
                'SELECT DISTINCT ancestor_address FROM referral_relations WHERE user_address = ?',
                [userAddress.toLowerCase()]
            );
            
            for (const ancestor of ancestors) {
                await nodeLevelService.checkAndUpgradeNodeLevel(ancestor.ancestor_address);
            }
            
            logger.info(`✅ Reward calculation completed for stakeId=${stakeId}`);
            
        } catch (error) {
            logger.error(`Failed to process rewards for stakeId=${stakeId}:`, error);
        }
    }
    
    /**
     * 验证质押参数
     * @throws Error 如果参数无效
     */
    private validateStakeParams(timestamp: any, amount: any, lockPeriod: any): void {
        const ts = Number(timestamp?.toString() || '0');
        const amt = BigInt(amount?.toString() || '0');
        const lock = Number(lockPeriod?.toString() || '0');
        
        // 验证timestamp
        if (ts <= 0) {
            throw new Error(`Invalid timestamp: ${ts} (must be > 0)`);
        }
        const now = Math.floor(Date.now() / 1000);
        if (ts > now + 3600) {
            throw new Error(`Invalid timestamp: ${ts} (future time not allowed)`);
        }
        
        // 验证amount
        if (amt <= 0n) {
            throw new Error(`Invalid amount: ${amt} (must be > 0)`);
        }
        
        // 验证lockPeriod
        const validLockPeriods = [0, 30, 90, 180, 365];
        if (!validLockPeriods.includes(lock)) {
            throw new Error(`Invalid lockPeriod: ${lock} (must be one of ${validLockPeriods.join(', ')})`);
        }
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getStatus(): {
        isRunning: boolean;
        lastProcessedBlock: number;
        confirmationBlocks: number;
    } {
        return {
            isRunning: this.isRunning,
            lastProcessedBlock: this.lastProcessedBlock,
            confirmationBlocks: this.config.confirmationBlocks
        };
    }
}

export default EventMonitor;
