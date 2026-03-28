import express from 'express';
import { getPool } from '../config/database.config';

const router = express.Router();

// 获取用户的推荐奖励
router.get('/referral-rewards/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    
    // 查询待发放的奖励
    const [matured]: any = await pool.query(`
      SELECT 
        SUM(reward_amount) as total_matured,
        COUNT(*) as count
      FROM direct_referral_rewards
      WHERE LOWER(referrer_address) = LOWER(?)
        AND status = 'SETTLED'
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

    // 本月已结算（用于「我的网络」直推奖励卡片）
    const [monthRows]: any = await pool.query(
      `
      SELECT COALESCE(SUM(reward_amount), 0) AS total_month
      FROM direct_referral_rewards
      WHERE LOWER(referrer_address) = LOWER(?)
        AND status = 'SETTLED'
        AND YEAR(COALESCE(paid_time, stake_time, created_at)) = YEAR(CURDATE())
        AND MONTH(COALESCE(paid_time, stake_time, created_at)) = MONTH(CURDATE())
    `,
      [address]
    );
    const settledThisMonth = parseFloat(monthRows[0]?.total_month || 0);
    
    res.json({
      success: true,
      data: {
        matured: parseFloat(matured[0]?.total_matured || 0),
        pending: parseFloat(pending[0]?.total_pending || 0),
        maturedCount: matured[0]?.count || 0,
        pendingCount: pending[0]?.count || 0,
        settledThisMonth,
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
