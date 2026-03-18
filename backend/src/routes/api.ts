import express from 'express';
import { getPool } from '../config/database.config';
import { EffectiveLevelService } from '../services/EffectiveLevelService';

const router = express.Router();
const effectiveLevelService = new EffectiveLevelService();

function safeLowerAddress(addr: string) {
  return String(addr || '').trim().toLowerCase()
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function formatPercent01(n: number) {
  const v = clamp01(n)
  return Math.round(v * 1000) / 10
}

function gradeFromScore(score: number) {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

/**
 * 推荐质量考核（面向前端 Nodes 页卡片）
 * 只依赖 DB：referral_bindings / stake_events / withdrawal_events
 */
router.get('/quality/:address', async (req, res) => {
  try {
    const address = safeLowerAddress(req.params.address)
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return res.status(400).json({ success: false, error: 'address 参数不合法' })
    }

    const pool = getPool()

    // 1) 直推列表 + 绑定时间
    const [bindings] = await pool.query(
      `SELECT user_address, timestamp
       FROM referral_bindings
       WHERE LOWER(referrer_address) = ?
       ORDER BY timestamp ASC`,
      [address],
    )

    const direct = (bindings as any[]).map((r) => ({
      user: safeLowerAddress(r.user_address),
      bindTs: Number(r.timestamp || 0),
    }))

    if (direct.length === 0) {
      return res.json({
        success: true,
        data: {
          address,
          score: 0,
          grade: 'D',
          directCount: 0,
          effectiveCount: 0,
          effectiveRate: 0,
          tierDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
          avgStakeUsdtEq: 0,
          retainedRate: 0,
          penalties: ['暂无直推数据：先邀请 1 位好友完成质押绑定'],
          updatedAt: Date.now(),
        },
      })
    }

    const users = direct.map((d) => d.user)

    // 2) 统计直推的累计质押（按 USDT 等值）
    // 约定：stake_events.amount 为 18 位精度的字符串；event_type = 'USDT' | 'RWA'
    const [stakeRows] = await pool.query(
      `SELECT LOWER(user_address) as user, event_type, SUM(CAST(amount AS DECIMAL(65,0))) as sum_amount
       FROM stake_events
       WHERE LOWER(user_address) IN (?)
       GROUP BY LOWER(user_address), event_type`,
      [users],
    )

    // 3) 统计直推的累计提现（用于留存率估算）
    const [wdRows] = await pool.query(
      `SELECT LOWER(user_address) as user, event_type, SUM(CAST(amount AS DECIMAL(65,0))) as sum_amount
       FROM withdrawal_events
       WHERE LOWER(user_address) IN (?)
       GROUP BY LOWER(user_address), event_type`,
      [users],
    )

    const stakeMap = new Map<string, { usdt: bigint; rwa: bigint }>()
    for (const r of stakeRows as any[]) {
      const user = safeLowerAddress(r.user)
      const type = String(r.event_type || '').toUpperCase()
      const v = BigInt(String(r.sum_amount || '0'))
      const cur = stakeMap.get(user) || { usdt: 0n, rwa: 0n }
      if (type === 'RWA') cur.rwa += v
      else cur.usdt += v
      stakeMap.set(user, cur)
    }

    const wdMap = new Map<string, { usdt: bigint; rwa: bigint }>()
    for (const r of wdRows as any[]) {
      const user = safeLowerAddress(r.user)
      const type = String(r.event_type || '').toUpperCase()
      const v = BigInt(String(r.sum_amount || '0'))
      const cur = wdMap.get(user) || { usdt: 0n, rwa: 0n }
      if (type.includes('RWA')) cur.rwa += v
      else cur.usdt += v
      wdMap.set(user, cur)
    }

    const ONE_E18 = 10n ** 18n
    const RWA_TO_USDT_NUM = 85n
    const RWA_TO_USDT_DEN = 100n
    const nowTs = Math.floor(Date.now() / 1000)

    function stakeUsdtEq18(user: string) {
      const s = stakeMap.get(user) || { usdt: 0n, rwa: 0n }
      // USDT 质押：按 18 位 USDT 计
      const usdt = s.usdt
      // RWA 质押：按 0.85 折算成 USDT 等值
      const rwaEq = (s.rwa * RWA_TO_USDT_NUM) / RWA_TO_USDT_DEN
      return usdt + rwaEq
    }

    function withdrawnUsdtEq18(user: string) {
      const w = wdMap.get(user) || { usdt: 0n, rwa: 0n }
      // withdrawal_events.event_type 在不同版本里可能是：USDT / RWA / RWA_YIELD / USDT_REWARD 等
      // 这里按「USDT 直接计入，RWA 也按 0.85 折算」做近似（用于留存趋势，非精确财务口径）。
      const usdt = w.usdt
      const rwaEq = (w.rwa * RWA_TO_USDT_NUM) / RWA_TO_USDT_DEN
      return usdt + rwaEq
    }

    const tiers = { S: 0, A: 0, B: 0, C: 0, D: 0 } as Record<'S' | 'A' | 'B' | 'C' | 'D', number>
    const penalties: string[] = []

    // Tier 规则（可调整）：按「质押等值 + 绑定时长」粗分
    function tierOf(user: string, bindTs: number): 'S' | 'A' | 'B' | 'C' | 'D' {
      const stakeEq = stakeUsdtEq18(user)
      const days = bindTs > 0 ? (nowTs - bindTs) / 86400 : 0
      const stakeU = Number(stakeEq / ONE_E18) // 只用于分段，不做精算

      if (stakeU >= 2000 && days >= 7) return 'S'
      if (stakeU >= 1000 && days >= 5) return 'A'
      if (stakeU >= 300 && days >= 3) return 'B'
      if (stakeU >= 100 && days >= 1) return 'C'
      return 'D'
    }

    // 质量分：核心三项 + 扣分项（复杂版先落地“可用且稳定”，后续再加更多指标）
    // - 有效率：直推中 tier >= B 的占比（更强调“有效质押/留存”）
    // - 平均质押：直推平均 USDT 等值（控制“羊毛党小号”）
    // - 留存率：1 - totalWithdraw / totalStake（近似）
    const perUser = direct.map((d) => {
      const t = tierOf(d.user, d.bindTs)
      tiers[t] += 1
      const stakeEq = stakeUsdtEq18(d.user)
      const wdEq = withdrawnUsdtEq18(d.user)
      return { ...d, tier: t, stakeEq, wdEq }
    })

    const directCount = perUser.length
    const effectiveCount = perUser.filter((u) => u.tier === 'S' || u.tier === 'A' || u.tier === 'B').length
    const effectiveRate = directCount > 0 ? effectiveCount / directCount : 0

    const totalStake = perUser.reduce((acc, u) => acc + u.stakeEq, 0n)
    const totalWd = perUser.reduce((acc, u) => acc + u.wdEq, 0n)
    const avgStake = directCount > 0 ? totalStake / BigInt(directCount) : 0n

    const retainedRate = totalStake > 0n ? Number((totalStake - (totalWd > totalStake ? totalStake : totalWd)) * 10000n / totalStake) / 10000 : 0

    // 打分（0-100）
    let score = 0
    // 1) 有效率 0-45
    score += Math.round(clamp01(effectiveRate) * 45)
    // 2) 平均质押 0-35（>=1000 记满分）
    const avgStakeU = Number(avgStake / ONE_E18)
    score += Math.round(clamp01(avgStakeU / 1000) * 35)
    // 3) 留存率 0-20（>=70% 记满分）
    score += Math.round(clamp01(retainedRate / 0.7) * 20)

    // 扣分：集中度过高（前 1 人占比过大）
    const maxStake = perUser.reduce((m, u) => (u.stakeEq > m ? u.stakeEq : m), 0n)
    const top1Share = totalStake > 0n ? Number((maxStake * 10000n) / totalStake) / 10000 : 0
    if (top1Share > 0.6 && directCount >= 3) {
      score -= 10
      penalties.push(`集中度偏高：团队质押 Top1 占比 ${Math.round(top1Share * 100)}%（建议提升更多成员的有效质押）`)
    }

    // 扣分：D 过多
    const dRate = directCount > 0 ? tiers.D / directCount : 0
    if (dRate > 0.5 && directCount >= 4) {
      score -= 10
      penalties.push(`低质量成员偏多：D 档占比 ${Math.round(dRate * 100)}%（建议引导直推完成 ≥100 USDT 等值质押并保持 3 天以上）`)
    }

    score = Math.max(0, Math.min(100, score))

    if (penalties.length === 0) {
      if (score >= 80) penalties.push('推荐质量良好：保持新增有效质押与留存，可稳定提升节点等级与推荐收益')
      else penalties.push('可提升空间：提高直推成员的有效质押与留存，质量分会更快上涨')
    }

    res.json({
      success: true,
      data: {
        address,
        score,
        grade: gradeFromScore(score),
        directCount,
        effectiveCount,
        effectiveRatePercent: formatPercent01(effectiveRate),
        tierDistribution: tiers,
        avgStakeUsdtEq: Number(avgStake / ONE_E18),
        retainedRatePercent: formatPercent01(retainedRate),
        penalties,
        updatedAt: Date.now(),
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || String(error || 'unknown error') })
  }
})

// 获取用户质押记录
router.get('/stakes/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pool = getPool();
    
    const [stakes] = await pool.query(
      `SELECT * FROM stake_events WHERE LOWER(user_address) = LOWER(?) ORDER BY timestamp DESC`,
      [address]
    );
    
    res.json({
      success: true,
      data: stakes
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取用户等级信息（前端 useTeamData 调用）
router.get('/user/:address/level-info', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await effectiveLevelService.getEffectiveLevel(address);

    res.json({
      success: true,
      data: {
        nodeLevel: result.level,
        cumulativePersonalStake: result.cumulativePersonalStake,
        teamVolume: result.teamVolume,
        teamTotalDeposited: result.teamTotalDeposited,
        teamTotalWithdrawn: result.teamTotalWithdrawn,
        teamRetained: result.teamRetained,
      },
    });
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
