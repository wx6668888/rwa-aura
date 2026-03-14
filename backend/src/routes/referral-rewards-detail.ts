import { Router } from 'express';
import { query } from '../config/database.config';
import logger from '../utils/logger';

const router = Router();

/**
 * 获取用户的推荐奖励详情
 * GET /api/referral-rewards/:address
 */
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        // 获取所有待发放奖励（PENDING + SETTLED）
        const pendingRewards = await query(
            `SELECT 
                drr.referee_address,
                drr.stake_amount,
                drr.stake_type,
                drr.reward_amount,
                drr.stake_time,
                drr.status,
                drr.stake_id,
                se.block_number
            FROM direct_referral_rewards drr
            LEFT JOIN stake_events se ON drr.stake_id = se.stake_id
            WHERE LOWER(drr.referrer_address) = LOWER(?)
            AND drr.status IN ('PENDING', 'SETTLED')
            ORDER BY drr.stake_time DESC`,
            [address]
        ) as any[];
        
        // 计算总待发放金额（RWA转USDT，1 RWA = 0.85 USDT）
        const totalPendingRWA = pendingRewards.reduce((sum, r) => sum + parseFloat(r.reward_amount), 0);
        const totalPending = totalPendingRWA * 0.85;
        
        // 计算下次发放时间（每周一凌晨2点）
        const now = new Date();
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
        nextMonday.setHours(2, 0, 0, 0);
        
        res.json({
            success: true,
            data: {
                totalPending: totalPending.toFixed(2),
                totalPendingRWA: totalPendingRWA.toFixed(2),
                nextSettlement: nextMonday.toISOString(),
                records: pendingRewards.map(r => ({
                    referee: r.referee_address,
                    amount: parseFloat(r.stake_amount).toFixed(2),
                    type: r.stake_type,
                    rewardRWA: parseFloat(r.reward_amount).toFixed(2),
                    rewardUSDT: parseFloat(r.reward_amount).toFixed(2),
                    time: r.stake_time,
                    status: r.status,
                    blockNumber: r.block_number
                }))
            }
        });
    } catch (error) {
        logger.error('Failed to get referral rewards:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
