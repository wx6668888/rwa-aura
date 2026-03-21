import { Router } from 'express';
import { query } from '../config/database.config';
import logger from '../utils/logger';

const router = Router();

/**
 * 获取用户的推荐奖励详情
 * GET /api/referral-rewards-detail/:address
 * reward_amount 已统一为 USDT（RWA 入库时已 ×0.85）
 */
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;

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

        const totalPending = pendingRewards.reduce((sum, r) => sum + parseFloat(r.reward_amount || '0'), 0);
        const nextMonday = new Date();
        nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
        nextMonday.setHours(2, 0, 0, 0);

        res.json({
            success: true,
            data: {
                totalPending: totalPending.toFixed(2),
                totalPendingRWA: (totalPending / 0.85).toFixed(2),
                nextSettlement: nextMonday.toISOString(),
                records: pendingRewards.map(r => {
                    const amt = parseFloat(r.reward_amount || '0');
                    return {
                        referee: r.referee_address,
                        amount: parseFloat(r.stake_amount).toFixed(2),
                        type: r.stake_type,
                        rewardRWA: (r.stake_type === 'RWA' ? amt / 0.85 : amt).toFixed(2),
                        rewardUSDT: amt.toFixed(2),
                        time: r.stake_time,
                        status: r.status,
                        blockNumber: r.block_number
                    };
                })
            }
        });
    } catch (error) {
        logger.error('Failed to get referral rewards:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
