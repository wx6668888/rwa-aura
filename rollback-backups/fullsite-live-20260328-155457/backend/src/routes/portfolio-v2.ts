// backend/src/routes/portfolio-v2.ts
// [Logic Memory] 新版 Portfolio API，使用 user_stats 表优化性能
// 不影响现有 API，作为优化版本并存

import express from 'express';
import { getPool } from '../config/database.config';

const router = express.Router();

/**
 * 获取用户投资组合数据（优化版）
 * 使用 user_stats 表，单次查询获取所有数据
 */
router.get('/v2/portfolio/:address', async (req, res) => {
  const { address } = req.params;
  const pool = getPool();
  
  try {
    // 1. 从 user_stats 表读取（单次查询）
    const [stats] = await pool.query(
      `SELECT 
        personal_usdt_staked,
        personal_rwa_staked,
        personal_total_usdt,
        direct_referrals,
        team_volume_usdt,
        team_retained_usdt,
        current_level,
        effective_level,
        last_calculated_at
       FROM user_stats 
       WHERE LOWER(user_address) = LOWER(?)
       LIMIT 1`,
      [address]
    ) as any[];
    
    // 如果 user_stats 没有数据，返回 404（前端会 fallback）
    if (!stats || stats.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User stats not found',
        fallback: true // 提示前端使用 fallback
      });
    }
    
    const data = stats[0];
    
    // 2. 从 users 表读取推荐人和节点等级
    const [user] = await pool.query(
      `SELECT 
        referrer,
        node_level,
        first_stake_time
       FROM users 
       WHERE LOWER(address) = LOWER(?)
       LIMIT 1`,
      [address]
    ) as any[];
    
    const userData = user && user.length > 0 ? user[0] : null;
    
    // 3. 返回数据（格式与前端期望一致）
    return res.json({
      success: true,
      source: 'user_stats', // 标记数据来源
      data: {
        // 个人质押数据
        usdtStaked: data.personal_usdt_staked || '0',
        rwaStaked: data.personal_rwa_staked || '0',
        totalUsdt: data.personal_total_usdt || '0',
        
        // 团队数据
        teamVolume: data.team_volume_usdt || '0',
        teamRetained: data.team_retained_usdt || '0',
        directReferrals: data.direct_referrals || 0,
        
        // 等级数据
        currentLevel: data.current_level || 1,
        effectiveLevel: data.effective_level || 1,
        nodeLevel: userData?.node_level || 1,
        
        // 推荐人
        referrer: userData?.referrer || '0x0000000000000000000000000000000000000000',
        
        // 首次质押时间
        firstStakeTime: userData?.first_stake_time || 0,
        
        // 元数据
        lastCalculated: data.last_calculated_at,
      }
    });
    
  } catch (error: any) {
    console.error('[PortfolioV2] Error:', error);
    // 返回 500 错误，前端会 fallback
    res.status(500).json({ 
      success: false, 
      error: error.message,
      fallback: true 
    });
  }
});

export default router;
