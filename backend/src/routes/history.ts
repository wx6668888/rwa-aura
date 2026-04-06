import { Router } from 'express';
import { query } from '../config/database.config';

const router = Router();

router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const sql = `
      (SELECT
         id,
         'stake' as type,
         CASE
           WHEN event_type LIKE '%RWA%' THEN 'stakeRWA'
           ELSE 'stakeUSDT'
         END as type_key,
         event_type,
         amount,
         block_number,
         timestamp,
         tx_hash
       FROM stake_events
       WHERE LOWER(user_address) = LOWER(?))
      UNION ALL
      (SELECT
         id,
         'withdrawal' as type,
         CASE
           WHEN event_type LIKE '%RWA%' THEN 'flexibleRWA'
           ELSE 'flexibleUSDT'
         END as type_key,
         event_type,
         amount,
         block_number,
         timestamp,
         tx_hash
       FROM withdrawal_events
       WHERE LOWER(user_address) = LOWER(?))
      UNION ALL
      (SELECT
         drr.id as id,
         'referral_reward' as type,
         'rewardReferral' as type_key,
         'REFERRAL_REWARD' as event_type,
         CAST(drr.reward_amount * 1000000000000000000 AS DECIMAL(65,0)) as amount,
         COALESCE(se.block_number, 0) as block_number,
         UNIX_TIMESTAMP(drr.stake_time) as timestamp,
         se.tx_hash as tx_hash
       FROM direct_referral_rewards drr
       LEFT JOIN stake_events se ON se.stake_id = drr.stake_id
       WHERE LOWER(drr.referrer_address) = LOWER(?)
         AND drr.status IN ('PENDING', 'SETTLED'))
      UNION ALL
      (SELECT
         ys.id as id,
         'yield_settlement' as type,
         'rewardRWA' as type_key,
         CONCAT('YIELD_SETTLEMENT_', ys.asset_type) as event_type,
         CAST(ys.total_yield * 1000000000000000000 AS DECIMAL(65,0)) as amount,
         0 as block_number,
         ys.settlement_time as timestamp,
         ys.tx_hash as tx_hash
       FROM yield_settlements ys
       WHERE LOWER(ys.user_address) = LOWER(?)
         AND ys.tx_hash IS NOT NULL
         AND ys.tx_hash <> 'PENDING'
         AND ys.total_yield > 0)
      ORDER BY timestamp DESC LIMIT ?
    `;

    const rows = await query(sql, [address, address, address, address, limit]) as any[];

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
