import express from 'express';
import { getPool } from '../config/database.config';
import { ethers } from 'ethers';

const router = express.Router();

router.get('/stats/homepage', async (req, res) => {
  try {
    const pool = getPool();

    // 1) 真实链上总质押（RWA单位）
    const rpcUrl = process.env.BSC_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
    const stakingAddress = process.env.STAKING_CONTRACT_ADDRESS;
    if (!rpcUrl || !stakingAddress) {
      throw new Error('Missing BSC_RPC_URL/BSC_TESTNET_RPC_URL or STAKING_CONTRACT_ADDRESS');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const staking = new ethers.Contract(
      stakingAddress,
      [
        'function totalStaked() view returns (uint256)',
        'function totalStakedRWA() view returns (uint256)',
      ],
      provider
    );
    const totalStakedUsdtRaw = await staking.totalStaked();
    const totalStakedRwaRaw = await staking.totalStakedRWA();
    const totalStakedUsdt = Number(ethers.formatUnits(totalStakedUsdtRaw, 18));
    const totalStakedRwa = Number(ethers.formatUnits(totalStakedRwaRaw, 18));
    // 协议内常用 1 RWA = 0.85 USDT 折算，统一输出 RWA 单位总锁仓（兼容旧前端）
    const tvlRwa = totalStakedRwa + totalStakedUsdt / 0.85;

    // 2) 真实质押人数（来自链上事件入库后的去重地址）
    const [userRows]: any = await pool.query(
      `SELECT COUNT(DISTINCT LOWER(user_address)) AS users
       FROM stake_events`
    );
    const users = Number(userRows?.[0]?.users || 0);

    // 3) 价格仍沿用运营配置（若无则回退默认）
    const [rows]: any = await pool.query('SELECT price FROM homepage_stats WHERE id = 1');
    const price = rows?.length ? Number(rows[0].price || 0.85) : 0.85;

    // 展示用：总锁仓折算为 USDT（USDT 本金 + RWA 本金 × RWA/USDT 价格）
    const tvlUsdt = totalStakedUsdt + totalStakedRwa * price;

    res.json({
      success: true,
      data: {
        tvlRwa,
        tvlUsdt,
        users,
        price
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

/** 首页「最近质押」：按 stake_events 入库时间倒序 */
router.get('/stats/homepage/recent-stakes', async (req, res) => {
  try {
    const pool = getPool();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '5'), 10) || 5, 1), 20);
    const [priceRows]: any = await pool.query('SELECT price FROM homepage_stats WHERE id = 1');
    const price = priceRows?.length ? Number(priceRows[0].price || 0.85) : 0.85;

    const [rows]: any = await pool.query(
      `SELECT LOWER(TRIM(user_address)) AS user_address,
              TRIM(event_type) AS event_type,
              TRIM(CAST(amount AS CHAR)) AS amount,
              CAST(timestamp AS CHAR) AS ts,
              tx_hash
       FROM stake_events
       ORDER BY IF(
         CAST(timestamp AS UNSIGNED) > 1000000000000,
         CAST(timestamp AS UNSIGNED),
         CAST(timestamp AS UNSIGNED) * 1000
       ) DESC
       LIMIT ?`,
      [limit]
    );

    const list = (rows as any[]).map((r) => {
      const et = String(r.event_type || '');
      const u = et.toUpperCase();
      const asset: 'USDT' | 'RWA' = u.includes('RWA') ? 'RWA' : 'USDT';
      let amountToken = 0;
      try {
        amountToken = Number(ethers.formatUnits(BigInt(String(r.amount || '0')), 18));
      } catch {
        amountToken = 0;
      }
      let tsMs = Number(r.ts ?? 0);
      if (Number.isFinite(tsMs) && tsMs > 0 && tsMs < 1e12) tsMs *= 1000;

      return {
        userAddress: String(r.user_address || ''),
        eventType: et,
        asset,
        amountToken,
        amountUsdtApprox: asset === 'RWA' ? amountToken * price : amountToken,
        timestampMs: tsMs || 0,
        txHash: r.tx_hash ? String(r.tx_hash) : null,
      };
    });

    res.json({ success: true, data: { rows: list, price } });
  } catch (error) {
    console.error('Recent stakes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent stakes' });
  }
});

export default router;
