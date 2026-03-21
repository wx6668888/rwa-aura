import { Router, Request, Response } from 'express';
import { query } from '../config/database.config';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/v2/earnings/:address
 * 
 * 从 user_stats 表读取 rwaPending（优化版本）
 * 响应时间：50ms（vs 链上 500-1000ms）
 */
router.get('/v2/earnings/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    // 从 user_stats 表读取（单次查询）
    const result = await query<any[]>(
      `SELECT 
        usdt_rwa_pending,
        rwa_rwa_pending,
        rwa_pending_updated_at
       FROM user_stats 
       WHERE LOWER(user_address) = LOWER(?)`,
      [address]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({
        success: false,
        fallback: true,
        message: 'User not found in user_stats, use fallback'
      });
    }

    const data = result[0];

    // 计算总 rwaPending
    const totalRwaPending = (
      BigInt(data.usdt_rwa_pending || '0') + 
      BigInt(data.rwa_rwa_pending || '0')
    ).toString();

    return res.json({
      success: true,
      source: 'user_stats',
      data: {
        usdtRwaPending: data.usdt_rwa_pending || '0',
        rwaRwaPending: data.rwa_rwa_pending || '0',
        totalRwaPending,
        lastUpdated: data.rwa_pending_updated_at
      }
    });

  } catch (error) {
    logger.error('Error in /api/v2/earnings:', error);
    return res.status(500).json({
      success: false,
      fallback: true,
      error: 'Internal server error'
    });
  }
});

export default router;
