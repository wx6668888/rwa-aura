import express from 'express';
import { query } from '../config/database.config';
import logger from '../utils/logger';

const router = express.Router();

// 简单认证中间件
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization;
    if (!token || token !== `Bearer ${process.env.ADMIN_TOKEN || 'admin123'}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

router.use(adminAuth);

// ==================== 推荐奖励管理 ====================
router.get('/referrals/summary', async (req, res) => {
    try {
        const [totalRewards, byStatus, topReferrers, recentBatches] = await Promise.all([
            query(`
                SELECT 
                    COUNT(*) as count,
                    SUM(reward_amount) as total,
                    status
                FROM direct_referral_rewards
                GROUP BY status
            `),
            query(`SELECT status, COUNT(*) as count FROM direct_referral_rewards GROUP BY status`),
            query(`
                SELECT 
                    referrer_address,
                    COUNT(*) as referral_count,
                    SUM(reward_amount) as total_rewards
                FROM direct_referral_rewards
                GROUP BY referrer_address
                ORDER BY total_rewards DESC
                LIMIT 10
            `),
            query(`SELECT * FROM referral_settlement_batches ORDER BY id DESC LIMIT 5`)
        ]);

        res.json({
            success: true,
            data: { totalRewards, byStatus, topReferrers, recentBatches }
        });
    } catch (error) {
        logger.error('Referrals summary error:', error);
        res.status(500).json({ error: 'Failed to fetch referrals summary' });
    }
});

// ==================== 收益管理 ====================
router.get('/yields/summary', async (req, res) => {
    try {
        const [totalYields, recentSettlements, byAssetType] = await Promise.all([
            query(`
                SELECT 
                    COUNT(DISTINCT user_address) as users,
                    COUNT(*) as settlements,
                    SUM(total_yield) as total
                FROM yield_settlements
            `),
            query(`SELECT * FROM yield_settlements ORDER BY settlement_time DESC LIMIT 20`),
            query(`
                SELECT 
                    asset_type,
                    COUNT(*) as count,
                    SUM(total_yield) as total
                FROM yield_settlements
                GROUP BY asset_type
            `)
        ]);

        res.json({
            success: true,
            data: {
                summary: (totalYields as any[])[0] || { users: 0, settlements: 0, total: 0 },
                recent: recentSettlements,
                byAssetType
            }
        });
    } catch (error) {
        logger.error('Yields summary error:', error);
        res.status(500).json({ error: 'Failed to fetch yields summary' });
    }
});

export default router;
