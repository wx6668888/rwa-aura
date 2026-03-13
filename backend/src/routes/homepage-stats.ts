import express from 'express';
import { getPool } from '../config/database.config';

const router = express.Router();

router.get('/stats/homepage', async (req, res) => {
  try {
    const pool = getPool();
    
    // 获取当前数据
    const [rows]: any = await pool.query('SELECT * FROM homepage_stats WHERE id = 1');
    
    if (rows.length === 0) {
      return res.json({
        success: true,
        data: { tvl: 5000000, users: 1000, price: 0.85 }
      });
    }
    
    const stats = rows[0];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 每日零点更新TVL
    if (stats.last_daily_update !== today) {
      const increase = Math.floor(Math.random() * 90000) + 10000; // 1-10万
      await pool.query(
        'UPDATE homepage_stats SET tvl = tvl + ?, last_daily_update = ? WHERE id = 1',
        [increase, today]
      );
      stats.tvl = parseFloat(stats.tvl) + increase;
    }
    
    // 随机增加用户数（1-60分钟）
    const lastUpdate = new Date(stats.last_user_update).getTime();
    const interval = Math.floor(Math.random() * 59 * 60 * 1000) + 60000;
    
    if (now.getTime() - lastUpdate > interval) {
      await pool.query(
        'UPDATE homepage_stats SET users = users + 1, last_user_update = NOW() WHERE id = 1'
      );
      stats.users = parseInt(stats.users) + 1;
    }
    
    res.json({
      success: true,
      data: {
        tvl: parseFloat(stats.tvl),
        users: parseInt(stats.users),
        price: parseFloat(stats.price)
      }
    });
  } catch (error) {
    console.error('Homepage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

export default router;
