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

    const rows = await query(sql, [address, address, limit]) as any[];
    
    // Convert RWA withdrawal amount from USDT equivalent back to RWA
    const processedRows = rows.map(row => {
      if (row.event_type === 'FlexibleRWAPrincipalWithdrawn') {
        // amount is stored as USDT equivalent (135 RWA * 0.85 = 114.75 USDT)
        // Convert back: 114.75 / 0.85 = 135 RWA
        const usdtEquiv = BigInt(row.amount);
        const rwaAmount = (usdtEquiv * 100n) / 85n;
        return { ...row, amount: rwaAmount.toString() };
      }
      return row;
    });

    res.json({
      success: true,
      data: { history: processedRows }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
