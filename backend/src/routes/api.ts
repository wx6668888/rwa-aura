import express from 'express';
import { getPool } from '../config/database.config';

const router = express.Router();

// 获取用户等级信息（前端 useTeamData 调用）
router.get('/user/:address/level-info', async (req, res) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    
    // 直接从 user_stats 表读取
    const [stats] = await pool.query(
      'SELECT * FROM user_stats WHERE LOWER(user_address) = LOWER(?)',
      [address]
    );
    
    const stat = (stats as any[])[0];
    
    if (stat) {
      res.json({
        success: true,
        data: {
          nodeLevel: stat.current_level || 1,
          cumulativePersonalStake: stat.personal_usdt_staked || '0',
          teamVolume: (BigInt(Math.floor((stat.team_volume_usdt || 0) * 1e18))).toString(),
          teamTotalDeposited: (BigInt(Math.floor((stat.team_volume_usdt || 0) * 1e18))).toString(),
          teamTotalWithdrawn: '0',
          teamRetained: (BigInt(Math.floor((stat.team_retained_usdt || 0) * 1e18))).toString(),
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          nodeLevel: 1,
          cumulativePersonalStake: '0',
          teamVolume: '0',
          teamTotalDeposited: '0',
          teamTotalWithdrawn: '0',
          teamRetained: '0',
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取用户团队信息
router.get('/team/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    
    // 获取直推成员
    const [directReferrals] = await pool.query(
      `SELECT user_address, timestamp 
       FROM referral_bindings 
       WHERE LOWER(referrer_address) = LOWER(?) 
       ORDER BY timestamp DESC`,
      [address]
    );
    
    // 获取团队总质押
    const [teamStakes] = await pool.query(
      `SELECT SUM(CAST(amount AS DECIMAL(36,18))) as total
       FROM stake_events
       WHERE LOWER(user_address) IN (
         SELECT LOWER(user_address) FROM referral_bindings WHERE LOWER(referrer_address) = LOWER(?)
       )`,
      [address]
    );
    
    res.json({
      success: true,
      data: {
        directReferrals: (directReferrals as any[]).length,
        members: directReferrals,
        teamTotalStake: (teamStakes as any[])[0]?.total || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取平台统计数据
router.get('/stats', async (req, res) => {
  try {
    const pool = getPool();
    
    const [totalStakes] = await pool.query(
      `SELECT 
        COUNT(DISTINCT user_address) as users,
        SUM(CAST(amount AS DECIMAL(36,18))) as total_amount
       FROM stake_events`
    );
    
    const last24h = Math.floor(Date.now() / 1000) - 86400;
    const [recent24h] = await pool.query(
      `SELECT COUNT(*) as count, SUM(CAST(amount AS DECIMAL(36,18))) as amount
       FROM stake_events
       WHERE timestamp > ?`,
      [last24h]
    );
    
    res.json({
      success: true,
      data: {
        totalUsers: (totalStakes as any[])[0]?.users || 0,
        totalStaked: (totalStakes as any[])[0]?.total_amount || 0,
        stakes24h: (recent24h as any[])[0]?.count || 0,
        volume24h: (recent24h as any[])[0]?.amount || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
