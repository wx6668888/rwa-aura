import { Router } from 'express';
import { query } from '../config/database.config';
import logger from '../utils/logger';

const router = Router();

router.post('/migrate-snapshots', async (req, res) => {
  try {
    logger.info('开始迁移数据到快照表...');
    
    // USDT质押
    const usdtStakes = await query<any[]>(`
      SELECT user_address, amount, lock_period, timestamp, tx_hash
      FROM stake_events WHERE event_type = 'USDT' AND amount > 0
      ORDER BY timestamp ASC
    `);

    for (const stake of usdtStakes) {
      const balanceType = stake.lock_period === 0 ? 'flexible' : `locked_${stake.lock_period}`;
      const lockEndTime = stake.lock_period > 0 ? stake.timestamp + stake.lock_period * 86400 : null;
      
      await query(`
        INSERT IGNORE INTO balance_snapshots 
        (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
        VALUES (?, 'USDT', ?, ?, ?, 'stake', ?, ?)
      `, [stake.user_address, balanceType, stake.amount, stake.timestamp, lockEndTime, stake.tx_hash]);
    }

    // RWA质押
    const rwaStakes = await query<any[]>(`
      SELECT user_address, amount, lock_period, timestamp, tx_hash
      FROM stake_events WHERE event_type = 'RWA' AND amount > 0
      ORDER BY timestamp ASC
    `);

    for (const stake of rwaStakes) {
      const balanceType = stake.lock_period === 0 ? 'flexible' : `locked_${stake.lock_period}`;
      const lockEndTime = stake.lock_period > 0 ? stake.timestamp + stake.lock_period * 86400 : null;
      
      await query(`
        INSERT IGNORE INTO balance_snapshots 
        (user_address, asset_type, balance_type, amount, timestamp, event_type, lock_end_time, tx_hash)
        VALUES (?, 'RWA', ?, ?, ?, 'stake', ?, ?)
      `, [stake.user_address, balanceType, stake.amount, stake.timestamp, lockEndTime, stake.tx_hash]);
    }

    res.json({ success: true, usdt: usdtStakes.length, rwa: rwaStakes.length });
  } catch (error: any) {
    logger.error('迁移失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
