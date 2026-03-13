import express from 'express';
import { getPool } from '../config/database.config';

const router = express.Router();

// 获取用户的推荐奖励
router.get('/referral-rewards/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    
    // 查询已到期的奖励
    const [rewards]: any = await pool.query(`
      SELECT 
        SUM(reward_amount) as total_matured,
        COUNT(*) as count
      FROM direct_referral_rewards
      WHERE LOWER(referrer_address) = LOWER(?)
        AND status = 'MATURED'
    `, [address]);
    
    // 查询待到期的奖励
    const [pending]: any = await pool.query(`
      SELECT 
        SUM(reward_amount) as total_pending,
        COUNT(*) as count
      FROM direct_referral_rewards
      WHERE LOWER(referrer_address) = LOWER(?)
        AND status = 'PENDING'
    `, [address]);
    
    res.json({
      success: true,
      data: {
        matured: parseFloat(rewards[0]?.total_matured || 0),
        pending: parseFloat(pending[0]?.total_pending || 0),
        maturedCount: rewards[0]?.count || 0,
        pendingCount: pending[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Referral rewards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch referral rewards'
    });
  }
});

export default router;
