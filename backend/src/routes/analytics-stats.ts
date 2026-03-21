import express from 'express';
import { getPool } from '../config/database.config';
import { ethers } from 'ethers';

const router = express.Router();

const ONE_E18 = 10n ** 18n;
const PRINCIPAL_TYPES = [
  'FlexibleUSDTPrincipalWithdrawn',
  'USDTPrincipalWithdrawn',
  'FlexibleRWAPrincipalWithdrawn',
  'RWAPrincipalWithdrawn',
  'EmergencyWithdrawal',
];

function weiToNumber(weiStr: string): number {
  try {
    return Number(ethers.formatUnits(BigInt(weiStr || '0'), 18));
  } catch {
    return 0;
  }
}

function formatDay(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** MySQL DATE / Date 对象 / ISO 字符串 → YYYY-MM-DD，避免 JSON 里变成带 T 的字符串导致前端过滤失败 */
function normalizeSqlDate(d: unknown): string {
  if (d == null || d === '') return formatDay(new Date());
  if (d instanceof Date) return formatDay(d);
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return formatDay(new Date(t));
  return formatDay(new Date());
}

function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

/** DB 可能存秒或毫秒时间戳，统一为秒（用于 FROM_UNIXTIME） */
function tsSecondsSql(col: string): string {
  return `IF(CAST(${col} AS UNSIGNED) > 1000000000000, FLOOR(CAST(${col} AS UNSIGNED) / 1000), CAST(${col} AS UNSIGNED))`;
}

/** 质押事件类型：USDT 侧（含 USDT、USDT_STAKE 等，排除含 RWA 的） */
const STAKE_USDT_SUM = `SUM(CASE WHEN UPPER(TRIM(event_type)) LIKE '%USDT%' AND UPPER(TRIM(event_type)) NOT LIKE '%RWA%' THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END)`;
/** RWA 质押（RWA、RWA_STAKE 等） */
const STAKE_RWA_SUM = `SUM(CASE WHEN UPPER(TRIM(event_type)) LIKE '%RWA%' THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END)`;

router.get('/stats/analytics', async (req, res) => {
  try {
    const pool = getPool();
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
        'function getGlobalCapInfo() view returns (uint256 totalStaked_, uint256 totalRewards_, uint256 maxRewards_, uint256 currentPercentage_, bool softLandingActive_)',
      ],
      provider
    );

    const [totalStakedUsdtRaw, totalStakedRwaRaw, capInfo] = await Promise.all([
      staking.totalStaked(),
      staking.totalStakedRWA(),
      staking.getGlobalCapInfo(),
    ]);

    const totalStakedUsdt = Number(ethers.formatUnits(totalStakedUsdtRaw, 18));
    const totalStakedRwa = Number(ethers.formatUnits(totalStakedRwaRaw, 18));

    const [priceRows]: any = await pool.query('SELECT price FROM homepage_stats WHERE id = 1');
    const price = priceRows?.length ? Number(priceRows[0].price || 0.85) : 0.85;

    const tvlUsdt = totalStakedUsdt + totalStakedRwa * price;
    const tvlRwa = totalStakedRwa + totalStakedUsdt / 0.85;

    const [userRows]: any = await pool.query(
      `SELECT COUNT(DISTINCT LOWER(user_address)) AS users FROM stake_events`
    );
    const users = Number(userRows?.[0]?.users || 0);

    const dynamicRewardsPaidUsdt = Number(ethers.formatUnits(capInfo.totalRewards_, 18));
    const maxDynamicRewardsUsdt = Number(ethers.formatUnits(capInfo.maxRewards_, 18));
    const rewardUsagePercent = Number(capInfo.currentPercentage_) / 100;
    const remainingRewardCapUsdt = Math.max(0, maxDynamicRewardsUsdt - dynamicRewardsPaidUsdt);

    const [refRows]: any = await pool.query(`SELECT COUNT(*) AS c FROM referral_bindings`);
    let referralPairs = Number(refRows?.[0]?.c || 0);
    if (referralPairs === 0) {
      const [pairFallback]: any = await pool.query(
        `SELECT COUNT(*) AS c FROM (
           SELECT DISTINCT LOWER(user_address) AS u, LOWER(referrer_address) AS r
           FROM stake_events
           WHERE referrer_address IS NOT NULL
             AND referrer_address != ''
             AND LOWER(referrer_address) != '0x0000000000000000000000000000000000000000'
         ) t`
      );
      referralPairs = Number(pairFallback?.[0]?.c || 0);
    }

    // 推荐深度：referral_path 中逗号分隔层级（若有）
    const [depthRows]: any = await pool.query(
      `SELECT referral_path FROM users WHERE referral_path IS NOT NULL AND referral_path != ''`
    );
    let maxReferralDepth = 0;
    for (const r of depthRows as any[]) {
      const p = String(r.referral_path || '');
      const depth = p.split(',').filter(Boolean).length;
      if (depth > maxReferralDepth) maxReferralDepth = depth;
    }

    // 节点分布：优先 users.node_level（NodeLevelService 链上/升级写入），再 user_stats（未同步时常为默认 1 覆盖真实等级）
    const LEVEL_COALESCE = `COALESCE(
          NULLIF(u.node_level, 0),
          NULLIF(us.effective_level, 0),
          NULLIF(us.current_level, 0),
          1
        )`;
    const [nodeRows]: any = await pool.query(
      `SELECT ${LEVEL_COALESCE} AS lvl,
        COUNT(*) AS c
       FROM (SELECT DISTINCT LOWER(user_address) AS addr FROM stake_events) s
       LEFT JOIN users u ON LOWER(u.address) = s.addr
       LEFT JOIN user_stats us ON LOWER(us.user_address) = s.addr
       GROUP BY ${LEVEL_COALESCE}
       ORDER BY lvl ASC`
    );
    const nodeCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const row of nodeRows as any[]) {
      const lv = Math.min(Math.max(Number(row.lvl) || 1, 1), 9);
      nodeCounts[lv - 1] += Number(row.c) || 0;
    }
    /** L1 增加展示用虚拟用户（与前端用户总数 +20 展示策略对齐） */
    const DISPLAY_USER_OFFSET_L1 = 20;
    nodeCounts[0] += DISPLAY_USER_OFFSET_L1;
    const nodeBuckets = nodeCounts.map((count, i) => ({ level: i + 1, count }));

    const tsCol = tsSecondsSql('timestamp');

    // 每日质押（USDT 与 RWA 折算 USDT；兼容 USDT_STAKE / RWA_STAKE 等 event_type）
    const [stakeDayRows]: any = await pool.query(
      `SELECT DATE(FROM_UNIXTIME(${tsCol})) AS d,
              ${STAKE_USDT_SUM} AS usdt_w,
              ${STAKE_RWA_SUM} AS rwa_w
       FROM stake_events
       GROUP BY DATE(FROM_UNIXTIME(${tsCol}))
       ORDER BY d ASC`
    );

    // 每日本金流出（withdrawal_events.amount 为 wei 字符串，已是 USDT 等值）
    const placeholders = PRINCIPAL_TYPES.map(() => '?').join(',');
    const [wdDayRows]: any = await pool.query(
      `SELECT DATE(FROM_UNIXTIME(${tsCol})) AS d,
              SUM(CAST(amount AS DECIMAL(65,0))) AS out_w
       FROM withdrawal_events
       WHERE event_type IN (${placeholders})
       GROUP BY DATE(FROM_UNIXTIME(${tsCol}))
       ORDER BY d ASC`,
      PRINCIPAL_TYPES
    );

    const stakeByDay = new Map<string, { usdt: bigint; rwa: bigint }>();
    for (const r of stakeDayRows as any[]) {
      const d = normalizeSqlDate(r.d);
      stakeByDay.set(d, {
        usdt: BigInt(String(r.usdt_w || '0')),
        rwa: BigInt(String(r.rwa_w || '0')),
      });
    }
    const wdByDay = new Map<string, bigint>();
    for (const r of wdDayRows as any[]) {
      wdByDay.set(normalizeSqlDate(r.d), BigInt(String(r.out_w || '0')));
    }

    const allDays = new Set<string>([...stakeByDay.keys(), ...wdByDay.keys()]);
    const sortedDays = [...allDays].sort();

    const dailyStakes: { date: string; usdt: number; rwaUsdt: number; totalUsdt: number }[] = [];
    const tvlCumulative: { date: string; tvlUsdt: number }[] = [];

    let runTvlWei = 0n;
    const priceScaled = BigInt(Math.round(price * 1e6));
    for (const d of sortedDays) {
      const s = stakeByDay.get(d) || { usdt: 0n, rwa: 0n };
      const out = wdByDay.get(d) || 0n;
      const rwaUsdtWei = (s.rwa * priceScaled) / 1000000n;
      const netWei = s.usdt + rwaUsdtWei - out;
      runTvlWei += netWei;

      const usdt = Number(s.usdt) / 1e18;
      const rwaUsdt = Number(rwaUsdtWei) / 1e18;
      dailyStakes.push({
        date: d,
        usdt,
        rwaUsdt,
        totalUsdt: usdt + rwaUsdt,
      });
      tvlCumulative.push({
        date: d,
        tvlUsdt: Number(runTvlWei) / 1e18,
      });
    }

    // 若链上 TVL 与累计曲线偏差大，以链上为准修正最后一天（避免历史漏扫导致图表离谱）
    if (tvlCumulative.length > 0) {
      const last = tvlCumulative[tvlCumulative.length - 1];
      last.tvlUsdt = tvlUsdt;
    } else if (tvlUsdt > 0) {
      tvlCumulative.push({ date: formatDay(new Date()), tvlUsdt });
    }

    // 每日奖励提现（静态；兼容不同版本 event_type 命名）
    const [rwDayRows]: any = await pool.query(
      `SELECT DATE(FROM_UNIXTIME(${tsCol})) AS d,
              SUM(CAST(amount AS DECIMAL(65,0))) AS w
       FROM withdrawal_events
       WHERE UPPER(TRIM(event_type)) LIKE '%RWA_REWARD%'
          OR UPPER(TRIM(event_type)) = 'RWARewardWithdrawn'
       GROUP BY DATE(FROM_UNIXTIME(${tsCol}))
       ORDER BY d ASC`
    );

    // 直推奖励（按结算时间；reward_amount 按 USDT 口径展示）
    let refRewRows: any[] = [];
    try {
      const [rr]: any = await pool.query(
        `SELECT DATE(COALESCE(paid_time, created_at)) AS d,
                SUM(CAST(reward_amount AS DECIMAL(36,18))) AS amt
         FROM direct_referral_rewards
         WHERE status IN ('SETTLED', 'PAID')
         GROUP BY DATE(COALESCE(paid_time, created_at))
         ORDER BY d ASC`
      );
      refRewRows = rr as any[];
    } catch {
      refRewRows = [];
    }

    const refRewByDay = new Map<string, number>();
    for (const r of refRewRows as any[]) {
      const key = normalizeSqlDate(r.d);
      refRewByDay.set(key, Number(r.amt || 0));
    }

    const dailyRewards: { date: string; staticRewards: number; referralRewards: number }[] = [];
    // 静态奖励提现：合约侧为 RWA 数量（wei），按 homepage 价格折算为 USDT 等值展示
    const staticByDay = new Map<string, number>();
    for (const r of rwDayRows as any[]) {
      const rwaRew = weiToNumber(String(r.w || '0'));
      staticByDay.set(normalizeSqlDate(r.d), rwaRew * price);
    }
    const rewardDays = new Set<string>([...staticByDay.keys(), ...refRewByDay.keys()]);
    for (const d of [...rewardDays].sort()) {
      dailyRewards.push({
        date: d,
        staticRewards: staticByDay.get(d) || 0,
        referralRewards: refRewByDay.get(d) || 0,
      });
    }

    // 推荐累计曲线（referral_bindings；空时从首笔带推荐人的质押日推导）
    const rbTs = tsSecondsSql('timestamp');
    const [bindDayRows]: any = await pool.query(
      `SELECT DATE(FROM_UNIXTIME(${rbTs})) AS d, COUNT(*) AS c
       FROM referral_bindings
       GROUP BY DATE(FROM_UNIXTIME(${rbTs}))
       ORDER BY d ASC`
    );
    const [firstStakeRows]: any = await pool.query(
      `SELECT LOWER(user_address) AS ua, MIN(${tsCol}) AS ts
       FROM stake_events
       GROUP BY LOWER(user_address)`
    );
    const newStakerByDay = new Map<string, number>();
    for (const r of firstStakeRows as any[]) {
      let ts = Number(r.ts || 0);
      if (!ts) continue;
      if (ts > 1e12) ts = Math.floor(ts / 1000);
      const d = formatDay(new Date(ts * 1000));
      newStakerByDay.set(d, (newStakerByDay.get(d) || 0) + 1);
    }

    const bindsPerDay = new Map<string, number>();
    for (const r of bindDayRows as any[]) {
      bindsPerDay.set(normalizeSqlDate(r.d), Number(r.c || 0));
    }
    let bindSum = [...bindsPerDay.values()].reduce((a, b) => a + b, 0);
    if (bindSum === 0) {
      const [bindFromStake]: any = await pool.query(
        `SELECT DATE(FROM_UNIXTIME(min_ts)) AS d, COUNT(*) AS c
         FROM (
           SELECT MIN(${tsCol}) AS min_ts
           FROM stake_events
           WHERE referrer_address IS NOT NULL
             AND referrer_address != ''
             AND LOWER(referrer_address) != '0x0000000000000000000000000000000000000000'
           GROUP BY LOWER(user_address)
         ) x
         GROUP BY DATE(FROM_UNIXTIME(min_ts))
         ORDER BY d ASC`
      );
      for (const r of bindFromStake as any[]) {
        bindsPerDay.set(normalizeSqlDate(r.d), Number(r.c || 0));
      }
    }

    const allGrowthDays = new Set<string>([...bindsPerDay.keys(), ...newStakerByDay.keys()]);
    const firstGrowth =
      allGrowthDays.size > 0
        ? [...allGrowthDays].sort((a, b) => parseDay(a).getTime() - parseDay(b).getTime())[0]
        : formatDay(new Date());
    const todayStr = formatDay(new Date());
    let cumRef = 0;
    let cumStakers = 0;
    const referralGrowth: { date: string; totalReferrals: number; cumulativeStakers: number; newStakersThatDay: number }[] = [];
    const startD = parseDay(firstGrowth);
    const endD = parseDay(todayStr);
    for (let i = 0; i <= daysBetween(startD, endD); i++) {
      const cur = new Date(startD);
      cur.setDate(cur.getDate() + i);
      const d = formatDay(cur);
      cumRef += bindsPerDay.get(d) || 0;
      const nNew = newStakerByDay.get(d) || 0;
      cumStakers += nNew;
      referralGrowth.push({
        date: d,
        totalReferrals: cumRef,
        cumulativeStakers: cumStakers,
        newStakersThatDay: nNew,
      });
    }

    // Top 10 质押（USDT 等值）
    const [aggStake]: any = await pool.query(
      `SELECT LOWER(user_address) AS addr,
              ${STAKE_USDT_SUM} AS usdt_w,
              ${STAKE_RWA_SUM} AS rwa_w
       FROM stake_events
       GROUP BY LOWER(user_address)`
    );
    const [rewAgg]: any = await pool.query(
      `SELECT LOWER(user_address) AS addr, SUM(CAST(amount AS DECIMAL(65,0))) AS w
       FROM withdrawal_events
       WHERE UPPER(TRIM(event_type)) LIKE '%RWA_REWARD%'
          OR UPPER(TRIM(event_type)) = 'RWARewardWithdrawn'
       GROUP BY LOWER(user_address)`
    );
    const rewMap = new Map<string, number>();
    for (const r of rewAgg as any[]) {
      rewMap.set(
        String(r.addr).toLowerCase(),
        weiToNumber(String(r.w || '0')) * price
      );
    }

    const stakeList = (aggStake as any[]).map((r) => {
      const addr = String(r.addr).toLowerCase();
      const usdt = Number(BigInt(String(r.usdt_w || '0'))) / 1e18;
      const rwa = Number(BigInt(String(r.rwa_w || '0'))) / 1e18;
      const stakeUsdt = usdt + rwa * price;
      return { addr, stakeUsdt, rewardsUsdt: rewMap.get(addr) || 0 };
    });
    stakeList.sort((a, b) => b.stakeUsdt - a.stakeUsdt);
    const topSlice = stakeList.slice(0, 10);
    const topTotal = topSlice.reduce((s, x) => s + x.stakeUsdt, 0) || 1;

    const addrList = topSlice.map((x) => x.addr);
    let levelMap = new Map<string, number>();
    if (addrList.length > 0) {
      const ph = addrList.map(() => '?').join(',');
      const [lvlRows]: any = await pool.query(
        `SELECT LOWER(u.address) AS a,
            COALESCE(
              NULLIF(u.node_level, 0),
              NULLIF(us.effective_level, 0),
              NULLIF(us.current_level, 0),
              1
            ) AS lvl
         FROM users u
         LEFT JOIN user_stats us ON LOWER(us.user_address) = LOWER(u.address)
         WHERE LOWER(u.address) IN (${ph})`,
        addrList
      );
      for (const r of lvlRows as any[]) {
        levelMap.set(String(r.a).toLowerCase(), Number(r.lvl) || 1);
      }
    }

    const topStakers = topSlice.map((row, i) => ({
      rank: i + 1,
      address: row.addr,
      level: Math.min(Math.max(levelMap.get(row.addr) || 1, 1), 9),
      stakeUsdt: row.stakeUsdt,
      rewardsUsdt: row.rewardsUsdt,
      share: (row.stakeUsdt / topTotal) * 100,
    }));

    // 奖励池 USDT 余额；国库 = 质押合约 owner 地址上的 RWA 余额 × homepage 价格（折算 USDT）
    let rewardPoolUsdt = 0;
    let treasuryOwnerUsdt = 0;
    /** owner 钱包 RWA 数量（18 位），便于前端或调试展示 */
    let treasuryOwnerRwa = 0;
    let treasuryOwnerAddress: string | null = null;
    const poolAddr = process.env.REFERRAL_REWARD_POOL;
    const usdtAddr =
      process.env.USDT_TOKEN_ADDRESS || process.env.USDT_ADDRESS || process.env.USDT_TOKEN;

    if (usdtAddr && poolAddr) {
      try {
        const usdt = new ethers.Contract(
          usdtAddr,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        const bal = await usdt.balanceOf(poolAddr);
        rewardPoolUsdt = Number(ethers.formatUnits(bal, 18));
      } catch {
        rewardPoolUsdt = 0;
      }
    }

    try {
      const stOwn = new ethers.Contract(
        stakingAddress,
        ['function owner() view returns (address)'],
        provider
      );
      const ownerAddr = (await stOwn.owner()) as string;
      treasuryOwnerAddress = String(ownerAddr).toLowerCase();

      let rwaTokenAddr =
        (process.env.RWA_TOKEN_ADDRESS || process.env.RWA_TOKEN || '').trim() || '';
      if (!rwaTokenAddr || rwaTokenAddr === ethers.ZeroAddress) {
        try {
          const stRwa = new ethers.Contract(
            stakingAddress,
            ['function rwaToken() view returns (address)'],
            provider
          );
          rwaTokenAddr = String(await stRwa.rwaToken()).toLowerCase();
        } catch {
          rwaTokenAddr = '';
        }
      }
      if (
        rwaTokenAddr &&
        rwaTokenAddr !== ethers.ZeroAddress &&
        treasuryOwnerAddress
      ) {
        const rwaC = new ethers.Contract(
          rwaTokenAddr,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        const rwaBal = await rwaC.balanceOf(treasuryOwnerAddress);
        treasuryOwnerRwa = Number(ethers.formatUnits(rwaBal, 18));
        treasuryOwnerUsdt = treasuryOwnerRwa * price;
      }
    } catch {
      treasuryOwnerUsdt = 0;
      treasuryOwnerRwa = 0;
      treasuryOwnerAddress = null;
    }

    // 30 日活跃质押率（时间戳兼容毫秒）
    const now = Math.floor(Date.now() / 1000);
    const since30 = now - 30 * 86400;
    const [activeRows]: any = await pool.query(
      `SELECT COUNT(DISTINCT LOWER(user_address)) AS c FROM stake_events WHERE ${tsCol} >= ?`,
      [since30]
    );
    const active30 = Number(activeRows?.[0]?.c || 0);
    const activeRate = users > 0 ? (active30 / users) * 100 : 0;

    res.json({
      success: true,
      data: {
        tvlUsdt,
        tvlRwa,
        totalStakedUsdt,
        totalStakedRwa,
        price,
        users,
        dynamicRewardsPaidUsdt,
        maxDynamicRewardsUsdt,
        rewardUsagePercent,
        remainingRewardCapUsdt,
        referralPairs,
        maxReferralDepth,
        nodeBuckets,
        dailyStakes,
        tvlCumulative,
        dailyRewards,
        referralGrowth,
        topStakers,
        rewardPoolUsdt,
        treasuryOwnerUsdt,
        treasuryOwnerRwa,
        treasuryOwnerAddress,
        activeStakers30d: active30,
        activeRate,
        updatedAt: Date.now(),
      },
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics stats',
    });
  }
});

/** 完整排行榜（与 analytics 质押汇总口径一致，RWA 按 homepage_stats 价格折算 USDT） */
router.get('/stats/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10) || 100, 1), 500);
    const pool = getPool();
    const [priceRows]: any = await pool.query('SELECT price FROM homepage_stats WHERE id = 1');
    const price = priceRows?.length ? Number(priceRows[0].price || 0.85) : 0.85;

    const [aggStake]: any = await pool.query(
      `SELECT LOWER(user_address) AS addr,
              ${STAKE_USDT_SUM} AS usdt_w,
              ${STAKE_RWA_SUM} AS rwa_w
       FROM stake_events
       GROUP BY LOWER(user_address)`
    );
    const [rewAgg]: any = await pool.query(
      `SELECT LOWER(user_address) AS addr, SUM(CAST(amount AS DECIMAL(65,0))) AS w
       FROM withdrawal_events
       WHERE UPPER(TRIM(event_type)) LIKE '%RWA_REWARD%'
          OR UPPER(TRIM(event_type)) = 'RWARewardWithdrawn'
       GROUP BY LOWER(user_address)`
    );
    const rewMap = new Map<string, number>();
    for (const r of rewAgg as any[]) {
      rewMap.set(
        String(r.addr).toLowerCase(),
        weiToNumber(String(r.w || '0')) * price
      );
    }
    const stakeList = (aggStake as any[]).map((r) => {
      const addr = String(r.addr).toLowerCase();
      const usdt = Number(BigInt(String(r.usdt_w || '0'))) / 1e18;
      const rwa = Number(BigInt(String(r.rwa_w || '0'))) / 1e18;
      const stakeUsdt = usdt + rwa * price;
      return { addr, stakeUsdt, rewardsUsdt: rewMap.get(addr) || 0 };
    });
    stakeList.sort((a, b) => b.stakeUsdt - a.stakeUsdt);
    const topSlice = stakeList.slice(0, limit);
    const topTotal = topSlice.reduce((s, x) => s + x.stakeUsdt, 0) || 1;
    const addrList = topSlice.map((x) => x.addr);
    const levelMap = new Map<string, number>();
    if (addrList.length > 0) {
      const ph = addrList.map(() => '?').join(',');
      const [lvlRows]: any = await pool.query(
        `SELECT LOWER(u.address) AS a,
            COALESCE(
              NULLIF(u.node_level, 0),
              NULLIF(us.effective_level, 0),
              NULLIF(us.current_level, 0),
              1
            ) AS lvl
         FROM users u
         LEFT JOIN user_stats us ON LOWER(us.user_address) = LOWER(u.address)
         WHERE LOWER(u.address) IN (${ph})`,
        addrList
      );
      for (const r of lvlRows as any[]) {
        levelMap.set(String(r.a).toLowerCase(), Number(r.lvl) || 1);
      }
    }
    const rows = topSlice.map((row, i) => ({
      rank: i + 1,
      address: row.addr,
      level: Math.min(Math.max(levelMap.get(row.addr) || 1, 1), 9),
      stakeUsdt: row.stakeUsdt,
      rewardsUsdt: row.rewardsUsdt,
      share: (row.stakeUsdt / topTotal) * 100,
    }));
    res.json({ success: true, data: { rows, price } });
  } catch (e) {
    console.error('Leaderboard error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

export default router;
