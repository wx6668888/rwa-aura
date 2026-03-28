import { Router } from 'express';
import { getPool } from '../config/database.config';

const router = Router();
const pool = getPool();

/**
 * GET /api/withdraw-v2/:address
 * 提现页面数据 v2 API（使用与Dashboard相同的数据源）
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    const userAddress = address.toLowerCase();
    const RWA_PRICE = 0.85;

    // 查询用户统计数据（余额）
    const [rows] = await pool.query(`
      SELECT 
        us.usdt_rwa_pending,
        us.rwa_rwa_pending,
        us.referral_balance,
        us.dividend_balance,
        us.strwa_balance
      FROM user_stats us
      WHERE us.user_address = ?
    `, [userAddress]) as any[];

    const data = rows?.[0] || {
      usdt_rwa_pending: '0',
      rwa_rwa_pending: '0',
      referral_balance: '0',
      dividend_balance: '0',
      strwa_balance: '0'
    };

    // 推荐奖励待结算（direct_referral_rewards），用于前端旧版本兜底显示
    const [refPendingRows] = await pool.query(`
      SELECT COALESCE(SUM(reward_amount), 0) AS total_pending
      FROM direct_referral_rewards
      WHERE LOWER(referrer_address) = LOWER(?)
        AND status = 'PENDING'
    `, [userAddress]) as any[];

    // 项目分红待结算（team_dividends），用于前端旧版本兜底显示
    let divPendingRows: any[] = [{ total_pending: 0 }];
    try {
      const [rowsPending] = await pool.query(`
        SELECT COALESCE(SUM(dividend_amount), 0) AS total_pending
        FROM team_dividends
        WHERE LOWER(user_address) = LOWER(?)
          AND status = 'PENDING'
      `, [userAddress]) as any[];
      divPendingRows = rowsPending || [{ total_pending: 0 }];
    } catch {
      // 历史库可能尚未创建 team_dividends 表，按 0 处理，避免整接口 500
      divPendingRows = [{ total_pending: 0 }];
    }

    // 使用与Dashboard相同的数据源
    const [stakeData] = await pool.query(`
      SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total 
      FROM stake_events 
      WHERE LOWER(user_address) = LOWER(?) 
      GROUP BY event_type
    `, [userAddress]) as any[];

    const [withdrawData] = await pool.query(`
      SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total 
      FROM withdrawal_events 
      WHERE LOWER(user_address) = LOWER(?) 
      GROUP BY event_type
    `, [userAddress]) as any[];

    const eventsArray = stakeData as Array<{ event_type: string; total: string }>;
    const withdrawalsArray = withdrawData as Array<{ event_type: string; total: string }>;

    const usdtStaked = BigInt(eventsArray.find(e => e.event_type.includes('USDT'))?.total || '0');
    const rwaStaked = BigInt(eventsArray.find(e => e.event_type.includes('RWA'))?.total || '0');

    const usdtWithdrawn = BigInt(withdrawalsArray.find(e => e.event_type.includes('USDT'))?.total || '0');
    const rwaWithdrawnUSDT = BigInt(withdrawalsArray.find(e => e.event_type.includes('RWA'))?.total || '0');
    const rwaWithdrawn = (rwaWithdrawnUSDT * 100n) / 85n;

    const remainingUSDT = usdtStaked > usdtWithdrawn ? usdtStaked - usdtWithdrawn : 0n;
    const remainingRWA = rwaStaked > rwaWithdrawn ? rwaStaked - rwaWithdrawn : 0n;

    // 查询锁仓质押
    const [lockedRows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN is_rwa_stake = 0 AND is_withdrawn = 0 THEN CAST(amount AS DECIMAL(38,0)) ELSE 0 END) as locked_usdt,
        SUM(CASE WHEN is_rwa_stake = 1 AND is_withdrawn = 0 THEN CAST(amount AS DECIMAL(38,0)) ELSE 0 END) as locked_rwa
      FROM locked_stakes
      WHERE user_address = ?
    `, [userAddress]) as any[];

    const lockedUSDT = BigInt(lockedRows[0]?.locked_usdt || '0');
    const lockedRWA = BigInt(lockedRows[0]?.locked_rwa || '0');

    // 计算灵活本金（与Dashboard一致）
    const flexUSDT = remainingUSDT > lockedUSDT ? remainingUSDT - lockedUSDT : 0n;
    const flexRWA = remainingRWA > lockedRWA ? remainingRWA - lockedRWA : 0n;

    // 计算各项金额
    const yieldAmount = ((Number(data.usdt_rwa_pending) + Number(data.rwa_rwa_pending)) / 1e18).toFixed(2);
    const referralBalance = Number(data.referral_balance || 0) / 1e6;
    // 推荐奖励：仅展示“已结算可提取”，待结算仅在详情中展示，不计入可提取金额
    const referralAmount = referralBalance.toFixed(2);

    const dividendBalance = Number(data.dividend_balance || 0) / 1e6;
    const dividendPendingRaw = Number(divPendingRows?.[0]?.total_pending || 0);
    // team_dividends.dividend_amount 通常为 6 位 USDT 精度整型，这里做自适应兜底
    const dividendPending = dividendPendingRaw > 1_000_000 ? (dividendPendingRaw / 1e6) : dividendPendingRaw;
    const dividendAmount = Math.max(dividendBalance, dividendPending).toFixed(2);
    const strwaAmount = (Number(data.strwa_balance) / 1e18).toFixed(2);
    
    const usdtPrincipal = (Number(flexUSDT) / 1e18).toFixed(2);
    const rwaPrincipal = (Number(flexRWA) / 1e18).toFixed(2);
    
    // 计算总金额（USD）
    const yieldUSD = parseFloat(yieldAmount) * RWA_PRICE;
    const rwaPrincipalUSD = parseFloat(rwaPrincipal) * RWA_PRICE;
    const strwaUSD = parseFloat(strwaAmount) * RWA_PRICE;
    const totalUSD = (yieldUSD + rwaPrincipalUSD + parseFloat(usdtPrincipal) + parseFloat(referralAmount) + parseFloat(dividendAmount) + strwaUSD).toFixed(2);

    // 查询锁仓明细
    const [lockedDetailRows] = await pool.query(`
      SELECT 
        stake_id,
        amount,
        is_rwa_stake,
        lock_period,
        lock_end_time,
        block_number as timestamp
      FROM locked_stakes
      WHERE user_address = ? AND is_withdrawn = 0
      ORDER BY lock_end_time ASC
    `, [userAddress]) as any[];

    const lockedStakes = (lockedDetailRows || []).map((row: any) => ({
      stakeId: row.stake_id,
      amount: Number(row.amount) / 1e18,
      lockPeriod: row.lock_period.toString(),
      lockEndTime: row.lock_end_time,
      isRWAStake: Boolean(row.is_rwa_stake),
      timestamp: row.timestamp
    }));

    res.json({
      success: true,
      data: {
        yieldAmount,
        rwaPrincipal,
        usdtPrincipal,
        referralAmount,
        dividendAmount,
        strwaAmount,
        totalUSD,
        lockedStakes
      }
    });

  } catch (error) {
    console.error('[withdraw-v2] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
