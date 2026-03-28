import { ethers } from 'ethers';
import { query } from '../config/database.config';
import logger from '../utils/logger';
import { getBscRpcUrl } from '../config/rpc-url';
import { BSC_MAINNET_ADDRESSES } from '../config/bsc-mainnet-addresses';

const RPC_URL = getBscRpcUrl();
const PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || '';
const REFERRAL_REWARD_POOL =
  process.env.REFERRAL_REWARD_POOL ||
  process.env.REFERRAL_REWARD_POOL_ADDRESS ||
  BSC_MAINNET_ADDRESSES.referralRewardPool;

const ABI = [
    'function batchDeposit(address[] calldata users, uint256[] calldata amounts) external'
];

export class ReferralRewardDistributor {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private contract: ethers.Contract;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(REFERRAL_REWARD_POOL, ABI, this.wallet);
    }

    async distributeRewards(): Promise<void> {
        try {
            logger.info('Starting referral reward distribution...');

            // 获取所有PENDING状态的推荐奖励
            const rewards = await query(
                `SELECT referrer_address, SUM(reward_amount) as total_reward
                FROM direct_referral_rewards
                WHERE status = 'PENDING'
                GROUP BY referrer_address`,
                []
            ) as any[];

            if (rewards.length === 0) {
                logger.info('No pending rewards to distribute');
                return;
            }

            const users: string[] = [];
            const amounts: bigint[] = [];

            for (const r of rewards) {
                users.push(r.referrer_address);
                // 转换为USDT的6位小数，先四舍五入到6位
                const amountDecimal = parseFloat(r.total_reward).toFixed(6);
                const amountInUsdt = ethers.parseUnits(amountDecimal, 6);
                amounts.push(amountInUsdt);
            }

            logger.info(`Distributing to ${users.length} users...`);

            // 调用合约批量充值
            const tx = await this.contract.batchDeposit(users, amounts);
            logger.info(`Transaction sent: ${tx.hash}`);

            await tx.wait();
            logger.info(`Transaction confirmed: ${tx.hash}`);

            // 更新数据库状态为SETTLED
            await query(
                `UPDATE direct_referral_rewards 
                SET status = 'SETTLED', paid_time = NOW() 
                WHERE status = 'PENDING'`,
                []
            );

            logger.info('Referral reward distribution completed');
        } catch (error) {
            logger.error('Failed to distribute referral rewards:', error);
            throw error;
        }
    }
}
