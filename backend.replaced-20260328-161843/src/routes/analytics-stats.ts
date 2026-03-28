import express from 'express';
import { getPool } from '../config/database.config';
import { ethers } from 'ethers';
import { NODE_REQUIREMENTS } from '../models/types';

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

function toBigIntSafe(v: unknown): bigint {
  try {
    return BigInt(String(v ?? '0'));
  } catch {
    return 0n;
  }
}

function calcEffectiveLevelFromMetrics(personalWei: bigint, teamVolumeWei: bigint, teamRetainedWei: bigint): number {
  let level = 1;
  for (const req of NODE_REQUIREMENTS) {
    if (req.level <= 1) continue;
    const p = toBigIntSafe(req.personalStakeUSDT);
    const tv = toBigIntSafe(req.teamVolumeUSDT);
    const tr = toBigIntSafe(req.teamRetainedUSDT);
    if (personalWei >= p && teamVolumeWei >= tv && teamRetainedWei >= tr) level = req.level;
    else break;
  }
  return Math.min(Math.max(level, 1), 9);
}

async function loadEffectiveLevelMap(pool: any, addresses: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (addresses.length === 0) return out;
  const ph = addresses.map(() => '?').join(',');
  const [rows]: any = await pool.query(
    `SELECT LOWER(address) AS addr,
            COALESCE(cumulative_personal_stake, '0') AS personal_w,
            COALESCE(team_volume, '0') AS team_w,
            COALESCE(team_total_deposited, '0') AS dep_w,
            COALESCE(team_total_withdrawn, '0') AS wdr_w,
            COALESCE(node_level, 1) AS node_level
     FROM users
     WHERE LOWER(address) IN (${ph})`,
    addresses
  );
  for (const r of rows as any[]) {
    const addr = String(r.addr || '').toLowerCase();
    const personal = toBigIntSafe(r.personal_w);
    const team = toBigIntSafe(r.team_w);
    const dep = toBigIntSafe(r.dep_w);
    const wdr = toBigIntSafe(r.wdr_w);
    const retained = dep > wdr ? dep - wdr : 0n;
    const eff = calcEffectiveLevelFromMetrics(personal, team, retained);
    const onDb = Number(r.node_level || 1) || 1;
    out.set(addr, Math.max(eff, Math.min(Math.max(onDb, 1), 9)));
  }
  return out;
}

/** 质押事件类型：USDT 侧（含 USDT、USDT_STAKE 等，排除含 RWA 的） */
const STAKE_USDT_SUM = `SUM(CASE WHEN UPPER(TRIM(event_type)) LIKE '%USDT%' AND UPPER(TRIM(event_type)) NOT LIKE '%RWA%' THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END)`;
/** RWA 质押（RWA、RWA_STAKE 等） */
const STAKE_RWA_SUM = `SUM(CASE WHEN UPPER(TRIM(event_type)) LIKE '%RWA%' THEN CAST(amount AS DECIMAL(65,0)) ELSE 0 END)`;

/** rewards.amount：含小数点按 RWA 数量；否则按 18 位 wei */
const REWARDS_RWA_AMOUNT_EXPR = `IF(
  LOCATE('.', TRIM(COALESCE(amount,''))) > 0,
  CAST(TRIM(amount) AS DECIMAL(36,18)),
  CAST(TRIM(amount) AS DECIMAL(65,0)) / 1000000000000000000
)`;

function maxMergedRewardUsdt(
  maps: Map<string, number>[],
  extraKeys?: Iterable<string>
): Map<string, number> {
  const out = new Map<string, number>();
  const keys = new Set<string>();
  for (const m of maps) for (const k of m.keys()) keys.add(k);
  if (extraKeys) for (const k of extraKeys) keys.add(k);
  for (const k of keys) {
    let v = 0;
    for (const m of maps) v = Math.max(v, m.get(k) || 0);
    out.set(k, v);
  }
  return out;
}

/** 提现记录、每日结算 yield_settlements、rewards 表按地址合并（USDT，同一地址取 max 防重复口径） */
async function loadMergedStakingRewardsUsdtByAddress(pool: any, price: number): Promise<Map<string, number>> {
  const [rewAgg]: any = await pool.query(
    `SELECT LOWER(user_address) AS addr, SUM(CAST(amount AS DECIMAL(65,0))) AS w
     FROM withdrawal_events
     WHERE UPPER(TRIM(event_type)) LIKE '%RWA_REWARD%'
        OR UPPER(TRIM(event_type)) = 'RWARewardWithdrawn'
        OR UPPER(TRIM(event_type)) = 'RWA_REWARD'
        OR UPPER(TRIM(event_type)) = 'WITHDRAWAL_REQUESTED'
     GROUP BY LOWER(user_address)`
  );
  const rewMapWithdraw = new Map<string, number>();
  for (const r of rewAgg as any[]) {
    rewMapWithdraw.set(String(r.addr).toLowerCase(), weiToNumber(String(r.w || '0')));
  }

  let ysByAddr = new Map<string, number>();
  try {
    const [ysAgg]: any = await pool.query(
      `SELECT LOWER(TRIM(user_address)) AS addr,
              COALESCE(SUM(CAST(total_yield AS DECIMAL(36,18))), 0) AS rwa
       FROM yield_settlements
       GROUP BY LOWER(TRIM(user_address))`
    );
    for (const r of ysAgg as any[]) {
      ysByAddr.set(String(r.addr).toLowerCase(), Number(r.rwa || 0) * price);
    }
  } catch {
    ysByAddr = new Map();
  }

  let rwTableByAddr = new Map<string, number>();
  try {
    const [rTab]: any = await pool.query(
      `SELECT LOWER(TRIM(user_address)) AS addr,
              COALESCE(SUM(${REWARDS_RWA_AMOUNT_EXPR}), 0) AS rwa
       FROM rewards
       WHERE LOWER(TRIM(COALESCE(reward_type,''))) IN ('daily_yield', 'static')
         AND UPPER(TRIM(COALESCE(token_type,''))) = 'RWA'
       GROUP BY LOWER(TRIM(user_address))`
    );
    for (const r of rTab as any[]) {
      rwTableByAddr.set(String(r.addr).toLowerCase(), Number(r.rwa || 0) * price);
    }
  } catch {
    rwTableByAddr = new Map();
  }

  return maxMergedRewardUsdt([rewMapWithdraw, ysByAddr, rwTableByAddr]);
}

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

    /** 链上「动态奖励/上限池」口径（与合约 cap 一致，不一定等于用户侧已领取总额） */
    const dynamicRewardsPaidUsdt = Number(ethers.formatUnits(capInfo.totalRewards_, 18));
    const maxDynamicRewardsUsdt = Number(ethers.formatUnits(capInfo.maxRewards_, 18));
    let rewardUsagePercent = Number(capInfo.currentPercentage_) / 100;
    let remainingRewardCapUsdt = Math.max(0, maxDynamicRewardsUsdt - dynamicRewardsPaidUsdt);

    // —— 质押静态收益（USDT）：以「每日结算入账」为主（yield_settlements / rewards），不与「已提现」简单相加，避免同一笔奖励双重统计
    let withdrawalRewardUsdt = 0;
    try {
      const [stRows]: any = await pool.query(
        `SELECT COALESCE(SUM(CAST(amount AS DECIMAL(65,0))), 0) AS w
         FROM withdrawal_events
         WHERE UPPER(TRIM(event_type)) LIKE '%RWA_REWARD%'
            OR UPPER(TRIM(event_type)) = 'RWARewardWithdrawn'
            OR UPPER(TRIM(event_type)) = 'RWA_REWARD'
            OR UPPER(TRIM(event_type)) = 'WITHDRAWAL_REQUESTED'`
      );
      withdrawalRewardUsdt = weiToNumber(String(stRows?.[0]?.w ?? '0'));
    } catch {
      withdrawalRewardUsdt = 0;
    }

    let yieldSettlementsRwa = 0;
    try {
      const [ys]: any = await pool.query(
        `SELECT COALESCE(SUM(CAST(total_yield AS DECIMAL(36,18))), 0) AS rwa FROM yield_settlements`
      );
      yieldSettlementsRwa = Number(ys?.[0]?.rwa ?? 0);
    } catch {
      yieldSettlementsRwa = 0;
    }
    const yieldSettlementsUsdt = yieldSettlementsRwa * price;

    let rewardsTableRwa = 0;
    try {
      const [rwa]: any = await pool.query(
        `SELECT COALESCE(SUM(${REWARDS_RWA_AMOUNT_EXPR}), 0) AS rwa
         FROM rewards
         WHERE LOWER(TRIM(COALESCE(reward_type,''))) IN ('daily_yield', 'static')
           AND UPPER(TRIM(COALESCE(token_type,''))) = 'RWA'`
      );
      rewardsTableRwa = Number(rwa?.[0]?.rwa ?? 0);
    } catch {
      rewardsTableRwa = 0;
    }
    const rewardsTableUsdt = rewardsTableRwa * price;

    const staticRewardsPaidTrackedUsdt = Math.max(
      withdrawalRewardUsdt,
      yieldSettlementsUsdt,
      rewardsTableUsdt
    );

    let referralRewardsPaidTrackedUsdt = 0;
    try {
      const [refTot]: any = await pool.query(
        `SELECT COALESCE(SUM(CAST(reward_amount AS DECIMAL(36,18))), 0) AS amt
         FROM direct_referral_rewards
         WHERE UPPER(TRIM(COALESCE(status,''))) NOT IN ('CANCELLED')
           AND CAST(COALESCE(reward_amount, 0) AS DECIMAL(36,18)) > 0`
      );
      referralRewardsPaidTrackedUsdt = Number(refTot?.[0]?.amt || 0);
    } catch {
      referralRewardsPaidTrackedUsdt = 0;
    }

    // 分红：凡库里有统计且非失败状态均计入（提现记录优先；无则团队分红台账）
    let dividendPaidTrackedUsdt = 0;
    try {
      const [dwRows]: any = await pool.query(
        `SELECT COALESCE(SUM(CAST(amount AS DECIMAL(36,18))), 0) AS amt
         FROM dividend_withdrawals
         WHERE UPPER(TRIM(COALESCE(status,''))) NOT IN ('FAILED')`
      );
      dividendPaidTrackedUsdt = Number(dwRows?.[0]?.amt || 0);
    } catch {
      dividendPaidTrackedUsdt = 0;
    }
    try {
      const [tdRows]: any = await pool.query(
        `SELECT COALESCE(SUM(CAST(dividend_amount AS DECIMAL(36,18))), 0) AS amt
         FROM team_dividends
         WHERE UPPER(TRIM(COALESCE(status,''))) NOT IN ('FAILED')`
      );
      const tdSum = Number(tdRows?.[0]?.amt || 0);
      if (dividendPaidTrackedUsdt > 0) {
        dividendPaidTrackedUsdt = Math.max(dividendPaidTrackedUsdt, tdSum);
      } else {
        dividendPaidTrackedUsdt = tdSum;
      }
    } catch {
      /* 表可能不存在 */
    }

    const totalRewardsTrackedUsdt =
      staticRewardsPaidTrackedUsdt + referralRewardsPaidTrackedUsdt + dividendPaidTrackedUsdt;
    if (rewardUsagePercent <= 0 && maxDynamicRewardsUsdt > 0 && totalRewardsTrackedUsdt > 0) {
      rewardUsagePercent = Math.min(100, (totalRewardsTrackedUsdt / maxDynamicRewardsUsdt) * 100);
      remainingRewardCapUsdt = Math.max(0, maxDynamicRewardsUsdt - totalRewardsTrackedUsdt);
    }

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

    // 节点分布：按 users 中的累计个人/团队/留存动态计算有效等级（并与 users.node_level 取较高值）
    const [stakerRows]: any = await pool.query(`SELECT DISTINCT LOWER(user_address) AS addr FROM stake_events`);
    const stakerAddrs = (stakerRows as any[]).map((r) => String(r.addr).toLowerCase());
    const effLevelMap = await loadEffectiveLevelMap(pool, stakerAddrs);
    const nodeCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const addr of stakerAddrs) {
      const lv = effLevelMap.get(addr) || 1;
      nodeCounts[lv - 1] += 1;
    }
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

    // 每日质押收益：结算入账（北京 8 点任务写入 yield_settlements / rewards）与链上提现记录取每日较大值，避免重复相加
    let ysDayRows: any[] = [];
    try {
      const [rows]: any = await pool.query(
        `SELECT DATE(FROM_UNIXTIME(${tsSecondsSql('settlement_time')})) AS d,
                COALESCE(SUM(CAST(total_yield AS DECIMAL(36,18))), 0) AS rwa
         FROM yield_settlements
         GROUP BY DATE(FROM_UNIXTIME(${tsSecondsSql('settlement_time')}))
         ORDER BY d ASC`
      );
      ysDayRows = rows as any[];
    } catch {
      ysDayRows = [];
    }
    let rewardsDayRows: any[] = [];
    try {
      const [rows]: any = await pool.query(
        `SELECT DATE(\`timestamp\`) AS d,
                COALESCE(SUM(${REWARDS_RWA_AMOUNT_EXPR}), 0) AS rwa
         FROM rewards
         WHERE LOWER(TRIM(COALESCE(reward_type,''))) IN ('daily_yield', 'static')
           AND UPPER(TRIM(COALESCE(token_type,''))) = 'RWA'
         GROUP BY DATE(\`timestamp\`)
         ORDER BY d ASC`
      );
      rewardsDayRows = rows as any[];
    } catch {
      rewardsDayRows = [];
    }

    // 每日奖励提现（兼容不同版本 event_type 命名）
    const [rwDayRows]: any = await pool.query(
      `SELECT DATE(FROM_UNIXTIME(${tsCol})) AS d,
              SUM(CAST(amount AS DECIMAL(65,0))) AS w
       FROM withdrawal_events
       WHERE UPPER(TRIM(event_type)) LIKE '%RWA_REWARD%'
          OR UPPER(TRIM(event_type)) = 'RWARewardWithdrawn'
          OR UPPER(TRIM(event_type)) = 'RWA_REWARD'
          OR UPPER(TRIM(event_type)) = 'WITHDRAWAL_REQUESTED'
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
         WHERE UPPER(TRIM(COALESCE(status,''))) NOT IN ('CANCELLED')
           AND CAST(COALESCE(reward_amount, 0) AS DECIMAL(36,18)) > 0
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
    const settlementDayUsdt = new Map<string, number>();
    for (const r of ysDayRows as any[]) {
      settlementDayUsdt.set(normalizeSqlDate(r.d), Number(r.rwa || 0) * price);
    }
    const rewardsDailyUsdt = new Map<string, number>();
    for (const r of rewardsDayRows as any[]) {
      rewardsDailyUsdt.set(normalizeSqlDate(r.d), Number(r.rwa || 0) * price);
    }
    const staticWithdrawByDay = new Map<string, number>();
    for (const r of rwDayRows as any[]) {
      staticWithdrawByDay.set(normalizeSqlDate(r.d), weiToNumber(String(r.w || '0')));
    }
    const staticByDay = maxMergedRewardUsdt([settlementDayUsdt, rewardsDailyUsdt, staticWithdrawByDay]);
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
    const rewMap = await loadMergedStakingRewardsUsdtByAddress(pool, price);

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
    const levelMap = await loadEffectiveLevelMap(pool, addrList);

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
        totalRewardsTrackedUsdt,
        staticRewardsPaidTrackedUsdt,
        referralRewardsPaidTrackedUsdt,
        dividendPaidTrackedUsdt,
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
    const rewMap = await loadMergedStakingRewardsUsdtByAddress(pool, price);
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
    const levelMap = await loadEffectiveLevelMap(pool, addrList);
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

/** 按团队净留存排序（user_stats.team_retained_usdt），用于「我的网络」排行榜 Tab */
router.get('/stats/leaderboard-retention', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
    const me = String(req.query.address || '')
      .trim()
      .toLowerCase();
    const pool = getPool();

    const [rows]: any = await pool.query(
      `SELECT LOWER(us.user_address) AS addr,
              CAST(COALESCE(us.team_retained_usdt, '0') AS DECIMAL(38, 6)) AS retained,
              COALESCE(us.direct_referrals, 0) AS directs,
              COALESCE(NULLIF(u.node_level, 0), NULLIF(us.effective_level, 0), NULLIF(us.current_level, 0), 1) AS lvl
       FROM user_stats us
       LEFT JOIN users u ON LOWER(u.address) = LOWER(us.user_address)
       ORDER BY retained DESC
       LIMIT ?`,
      [limit]
    );

    const list = (rows as any[]).map((r, i) => ({
      rank: i + 1,
      address: String(r.addr).toLowerCase(),
      teamRetainedUsdt: Number(r.retained) || 0,
      directReferrals: Number(r.directs) || 0,
      level: Math.min(Math.max(Number(r.lvl) || 1, 1), 9),
    }));

    let myRank: number | null = null;
    let myRetained = 0;
    if (me.startsWith('0x') && me.length === 42) {
      const [mine]: any = await pool.query(
        `SELECT CAST(COALESCE(team_retained_usdt, '0') AS DECIMAL(38, 6)) AS retained
         FROM user_stats WHERE LOWER(user_address) = ? LIMIT 1`,
        [me]
      );
      myRetained = Number(mine[0]?.retained) || 0;
      const [above]: any = await pool.query(
        `SELECT COUNT(*) AS c FROM user_stats
         WHERE CAST(COALESCE(team_retained_usdt, '0') AS DECIMAL(38, 6)) > ?`,
        [myRetained]
      );
      myRank = Number(above[0]?.c || 0) + 1;
    }

    res.json({ success: true, data: { rows: list, myRank, myRetainedUsdt: myRetained } });
  } catch (e) {
    console.error('Leaderboard retention error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch retention leaderboard' });
  }
});

export default router;
