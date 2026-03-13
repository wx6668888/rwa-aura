import { Router } from 'express';
import { query } from '../config/database.config';

const router = Router();

router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const sql = `
      (SELECT id, 'stake' as type, event_type, amount, block_number, UNIX_TIMESTAMP(timestamp) as timestamp FROM stake_events WHERE LOWER(user_address) = LOWER(?))
      UNION ALL
      (SELECT id, 'withdrawal' as type, event_type, amount, block_number, timestamp FROM withdrawal_events WHERE LOWER(user_address) = LOWER(?))
      ORDER BY timestamp DESC LIMIT ?
    `;

    const rows = await query(sql, [address, address, limit]);

    res.json({
      success: true,
      data: { history: rows }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
