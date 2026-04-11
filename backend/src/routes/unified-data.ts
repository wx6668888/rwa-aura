// [Logic Memory] 1 RWA = 0.85 USDT. Timestamp in seconds (Unix timestamp).
import express from 'express';
import { getPool } from '../config/database.config';

const router = express.Router();
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5000;
const OVERVIEW_CACHE_TTL = 8000;

function utcDayRangeSeconds(): { dayStart: number; dayEnd: number } {
  const now = new Date();
  const dayStart = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
  return { dayStart, dayEnd: dayStart + 86400 };
}

/** 当周：UTC 周一 00:00 至下周一 00:00 */
function utcWeekRangeSeconds(): { weekStart: number; weekEnd: number } {
  const now = new Date();
  const midnight = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
  const dow = now.getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  const weekStart = midnight - daysFromMonday * 86400;
  return { weekStart, weekEnd: weekStart + 7 * 86400 };
}

function utcMonthRangeSeconds(): { monthStart: number; monthEnd: number } {
  const now = new Date();
  const monthStart = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
  const monthEnd = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000);
  return { monthStart, monthEnd };
}

function mysqlDayKey(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d || '');
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function sumStakeByType(rows: Array<{ event_type: string; total: string | null }>) {
  let usdt = 0n;
  let rwa = 0n;
  for (const r of rows) {
    const t = (r.event_type || '').toUpperCase();
    const v = BigInt(r.total || '0');
    if (t.includes('USDT')) usdt += v;
    else if (t.includes('RWA')) rwa += v;
  }
  return { usdt, rwa };
}

function stakeToUsdtEq(usdt: bigint, rwa: bigint) {
  const rwaAsUsdt = (rwa * 85n) / 100n;
  return usdt + rwaAsUsdt;
}

function getCache(key: string) {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) return item.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number = CACHE_TTL) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

/** 推荐树最大递归深度，防止异常成环拖死查询 */
const MAX_DOWNLINE_DEPTH = 64;

/**
 * 无限代下级：在 referral_bindings 上沿「推荐人 → 被推荐人」向下遍历（不含本人）。
 * MySQL 8+ RECURSIVE CTE；失败时回退为仅直推一层。
 */
async function getDescendantAddresses(pool: any, root: string): Promise<string[]> {
  const r = String(root || '')
    .trim()
    .toLowerCase();
  if (!r.startsWith('0x') || r.length !== 42) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  let frontier: string[] = [r];
  let depth = 0;

  while (frontier.length > 0 && depth < MAX_DOWNLINE_DEPTH) {
    const placeholders = frontier.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT DISTINCT LOWER(user_address) AS ua
       FROM referral_bindings
       WHERE LOWER(referrer_address) IN (${placeholders})`,
      frontier
    );

    const next: string[] = [];
    for (const row of rows as Array<{ ua: string }>) {
      const ua = String(row.ua || '').toLowerCase();
      if (!ua || ua === r || seen.has(ua)) continue;
      seen.add(ua);
      result.push(ua);
      next.push(ua);
    }

    frontier = next;
    depth += 1;
  }

  return result;
}

async function getDirectReferralCount(pool: any, root: string): Promise<number> {
  const r = String(root || '')
    .trim()
    .toLowerCase();
  const [dRow] = await pool.query(
    `SELECT COUNT(DISTINCT user_address) AS c FROM referral_bindings WHERE LOWER(referrer_address) = ?`,
    [r]
  );
  return Number((dRow as any[])[0]?.c || 0);
}

async function getUnifiedData(address: string, dataType: string) {
  const pool = getPool();
  const cacheKey = `${address}_${dataType}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  try {
    switch (dataType) {
      case 'userStakes': {
        const [events] = await pool.query(
          `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE LOWER(user_address) = LOWER(?) GROUP BY event_type`,
          [address]
        );
        const eventsArray = events as Array<{ event_type: string; total: string }>;
        
        // Get withdrawals by type
        const [withdrawals] = await pool.query(
          `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE LOWER(user_address) = LOWER(?) GROUP BY event_type`,
          [address]
        );
        const withdrawalsArray = withdrawals as Array<{ event_type: string; total: string }>;
        
        const usdtStaked = BigInt(eventsArray.find(e => e.event_type.includes('USDT'))?.total || '0');
        const rwaStaked = BigInt(eventsArray.find(e => e.event_type.includes('RWA'))?.total || '0');
        
        // USDT withdrawals (direct USDT amount)
        const usdtWithdrawn = BigInt(withdrawalsArray.find(e => e.event_type.includes('USDT'))?.total || '0');
        
        // RWA withdrawals (stored as USDT equivalent, convert back to RWA)
        const rwaWithdrawnUSDT = BigInt(withdrawalsArray.find(e => e.event_type.includes('RWA'))?.total || '0');
        const rwaWithdrawn = (rwaWithdrawnUSDT * 100n) / 85n;
        
        const remainingUSDT = usdtStaked > usdtWithdrawn ? usdtStaked - usdtWithdrawn : 0n;
        const remainingRWA = rwaStaked > rwaWithdrawn ? rwaStaked - rwaWithdrawn : 0n;
        
        const result = {
          source: 'database',
          data: {
            usdtStaked: remainingUSDT.toString(),
            rwaStaked: remainingRWA.toString(),
            usdtRewards: '0',
            rwaRewards: '0',
            firstStakeTime: 0,
          }
        };
        setCache(cacheKey, result);
        return result;
      }
      
      case 'stakeList': {
        const [events] = await pool.query(
          `SELECT event_type, amount, timestamp, lock_period, block_number, tx_hash FROM stake_events WHERE LOWER(user_address) = LOWER(?) ORDER BY timestamp DESC`,
          [address]
        );
        const stakes = (events as any[]).map((e: any) => ({
          stakeId: `${e.event_type}_${e.timestamp}`,
          amount: e.amount,
          timestamp: e.timestamp,
          lockPeriod: e.lock_period === 0 ? 'flexible' : String(e.lock_period),
          assetType: e.event_type.includes('USDT') ? 'USDT' : 'RWA',
          blockNumber:
            e.block_number != null && e.block_number !== ''
              ? Number(e.block_number)
              : undefined,
          txHash: e.tx_hash || undefined,
        }));
        const result = { source: 'database', data: stakes };
        setCache(cacheKey, result);
        return result;
      }
      
      case 'teamStats': {
        // 口径统一（与 referralNetworkOverview / 节点页一致）：
        // - 直推人数 / 无限代下级：以 referral_bindings 为准（可校验、能立刻反映新绑定）
        // - 团队总质押 / 总留存：以 stake_events / withdrawal_events 聚合为准（USDT 等值；RWA×0.85）
        //
        // NOTE: user_stats 在不同部署/脚本路径下可能滞后，导致 dashboard 与节点页不一致。
        // 这里直接按事件聚合，避免“节点页有新增、dashboard 没新增”的体验问题。
        const [directCount, downline] = await Promise.all([
          getDirectReferralCount(pool, address),
          getDescendantAddresses(pool, address),
        ]);

        const me = address.toLowerCase();
        const teamAddrs = [me, ...downline.filter((a) => a && a !== me)];

        // 1) Team volume (stake_events 聚合；RWA 按 0.85 折算)
        let teamUSDT = 0n;
        let teamRWA = 0n;
        if (teamAddrs.length > 0) {
          const ph = teamAddrs.map(() => '?').join(',');
          const [agg] = await pool.query(
            `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total
             FROM stake_events
             WHERE LOWER(user_address) IN (${ph})
             GROUP BY event_type`,
            teamAddrs
          );
          (agg as any[]).forEach((s) => {
            const t = String(s.event_type || '').toUpperCase();
            const v = BigInt(s.total || 0);
            if (t.includes('USDT')) teamUSDT += v;
            else if (t.includes('RWA')) teamRWA += v;
          });
        }
        const totalTeamVolumeUSDT = stakeToUsdtEq(teamUSDT, teamRWA);

        // 2) Team withdrawn (withdrawal_events 直接加总；其中 RWA 提现已在写库时按 USDT 等值存储)
        let totalWithdrawn = 0n;
        if (teamAddrs.length > 0) {
          const ph = teamAddrs.map(() => '?').join(',');
          const [wdAgg] = await pool.query(
            `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total
             FROM withdrawal_events
             WHERE LOWER(user_address) IN (${ph})`,
            teamAddrs
          );
          totalWithdrawn = BigInt((wdAgg as any[])[0]?.total || 0);
        }

        const teamRetained = totalTeamVolumeUSDT > totalWithdrawn ? totalTeamVolumeUSDT - totalWithdrawn : 0n;

        const result = {
          source: 'database',
          data: {
            directReferrals: directCount,
            teamDownlineCount: downline.length,
            teamVolume: totalTeamVolumeUSDT.toString(),
            teamRetained: teamRetained.toString(),
          },
        };
        // 团队聚合较重：短 TTL 缓存，避免频繁刷新压库
        setCache(cacheKey, result, 10_000);
        return result;
      }

      case 'referralNetworkOverview': {
        const me = address.toLowerCase();
        const downline = await getDescendantAddresses(pool, address);
        const directCount = await getDirectReferralCount(pool, address);
        const teamAddrs = [me, ...downline.filter((a) => a && a !== me)];
        const { dayStart, dayEnd } = utcDayRangeSeconds();
        const ph = teamAddrs.map(() => '?').join(',');

        const [stTeamToday] = await pool.query(
          `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events 
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ? GROUP BY event_type`,
          [...teamAddrs, dayStart, dayEnd]
        );
        const teamTodayStake = sumStakeByType(stTeamToday as Array<{ event_type: string; total: string | null }>);

        const [wdTeamToday] = await pool.query(
          `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events 
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?`,
          [...teamAddrs, dayStart, dayEnd]
        );
        const teamTodayWithdraw = BigInt((wdTeamToday as any[])[0]?.total || 0);

        const [stMyToday] = await pool.query(
          `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events 
           WHERE LOWER(user_address) = ? AND timestamp >= ? AND timestamp < ? GROUP BY event_type`,
          [me, dayStart, dayEnd]
        );
        const myTodayStake = sumStakeByType(stMyToday as Array<{ event_type: string; total: string | null }>);

        const [wdMyToday] = await pool.query(
          `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events 
           WHERE LOWER(user_address) = ? AND timestamp >= ? AND timestamp < ?`,
          [me, dayStart, dayEnd]
        );
        const myTodayWithdraw = BigInt((wdMyToday as any[])[0]?.total || 0);

        const [lstTeamStakesToday] = await pool.query(
          `SELECT user_address, event_type, amount, timestamp, tx_hash FROM stake_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT 200`,
          [...teamAddrs, dayStart, dayEnd]
        );
        const [lstTeamWdToday] = await pool.query(
          `SELECT user_address, event_type, amount, timestamp, tx_hash FROM withdrawal_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT 200`,
          [...teamAddrs, dayStart, dayEnd]
        );
        const [lstMyStakesToday] = await pool.query(
          `SELECT user_address, event_type, amount, timestamp, tx_hash FROM stake_events
           WHERE LOWER(user_address) = ? AND timestamp >= ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT 100`,
          [me, dayStart, dayEnd]
        );
        const [lstMyWdToday] = await pool.query(
          `SELECT user_address, event_type, amount, timestamp, tx_hash FROM withdrawal_events
           WHERE LOWER(user_address) = ? AND timestamp >= ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT 100`,
          [me, dayStart, dayEnd]
        );

        const { weekStart, weekEnd } = utcWeekRangeSeconds();
        const { monthStart, monthEnd } = utcMonthRangeSeconds();

        const [stTeamWeek] = await pool.query(
          `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events 
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ? GROUP BY event_type`,
          [...teamAddrs, weekStart, weekEnd]
        );
        const teamWeekStake = sumStakeByType(stTeamWeek as Array<{ event_type: string; total: string | null }>);
        const [wdTeamWeek] = await pool.query(
          `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events 
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?`,
          [...teamAddrs, weekStart, weekEnd]
        );
        const teamWeekWithdraw = BigInt((wdTeamWeek as any[])[0]?.total || 0);

        const [lstTeamStakesWeek] = await pool.query(
          `SELECT user_address, event_type, amount, timestamp, tx_hash FROM stake_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT 200`,
          [...teamAddrs, weekStart, weekEnd]
        );
        const [lstTeamWdWeek] = await pool.query(
          `SELECT user_address, event_type, amount, timestamp, tx_hash FROM withdrawal_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT 200`,
          [...teamAddrs, weekStart, weekEnd]
        );

        const [stTeamMonth] = await pool.query(
          `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events 
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ? GROUP BY event_type`,
          [...teamAddrs, monthStart, monthEnd]
        );
        const teamMonthStake = sumStakeByType(stTeamMonth as Array<{ event_type: string; total: string | null }>);
        const [wdTeamMonth] = await pool.query(
          `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events 
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?`,
          [...teamAddrs, monthStart, monthEnd]
        );
        const teamMonthWithdraw = BigInt((wdTeamMonth as any[])[0]?.total || 0);

        const [lstTeamStakesMonth] = await pool.query(
          `SELECT user_address, event_type, amount, timestamp, tx_hash FROM stake_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT 200`,
          [...teamAddrs, monthStart, monthEnd]
        );
        const [lstTeamWdMonth] = await pool.query(
          `SELECT user_address, event_type, amount, timestamp, tx_hash FROM withdrawal_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT 200`,
          [...teamAddrs, monthStart, monthEnd]
        );

        const chartStart30 = dayStart - 29 * 86400;
        const chartEnd = dayStart + 86400;
        const [stChartRows] = await pool.query(
          `SELECT DATE(FROM_UNIXTIME(timestamp)) as d, event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total
           FROM stake_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           GROUP BY d, event_type`,
          [...teamAddrs, chartStart30, chartEnd]
        );
        const [wdChartRows] = await pool.query(
          `SELECT DATE(FROM_UNIXTIME(timestamp)) as d, SUM(CAST(amount AS DECIMAL(38,0))) as total
           FROM withdrawal_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           GROUP BY d`,
          [...teamAddrs, chartStart30, chartEnd]
        );
        const stakeByDay = new Map<string, { usdt: bigint; rwa: bigint }>();
        for (const r of stChartRows as any[]) {
          const k = mysqlDayKey(r.d);
          const cur = stakeByDay.get(k) || { usdt: 0n, rwa: 0n };
          const t = String(r.event_type || '').toUpperCase();
          const v = BigInt(r.total || 0);
          if (t.includes('USDT')) cur.usdt += v;
          else if (t.includes('RWA')) cur.rwa += v;
          stakeByDay.set(k, cur);
        }
        const wdByDay = new Map<string, bigint>();
        for (const r of wdChartRows as any[]) {
          const k = mysqlDayKey(r.d);
          wdByDay.set(k, BigInt(r.total || 0));
        }
        const teamChartDaily30: { date: string; stakeUsdtEqWei: string; withdrawWei: string }[] = [];
        for (let i = 0; i < 30; i++) {
          const ds = chartStart30 + i * 86400;
          const key = new Date(ds * 1000).toISOString().slice(0, 10);
          const st = stakeByDay.get(key) || { usdt: 0n, rwa: 0n };
          const wd = wdByDay.get(key) || 0n;
          teamChartDaily30.push({
            date: key,
            stakeUsdtEqWei: stakeToUsdtEq(st.usdt, st.rwa).toString(),
            withdrawWei: wd.toString(),
          });
        }

        const nowUtc = new Date();
        let y12 = nowUtc.getUTCFullYear();
        let mIdx = nowUtc.getUTCMonth() - 11;
        while (mIdx < 0) {
          mIdx += 12;
          y12 -= 1;
        }
        const monthChartStart = Math.floor(Date.UTC(y12, mIdx, 1) / 1000);
        const [stMonthRows] = await pool.query(
          `SELECT YEAR(FROM_UNIXTIME(timestamp)) as y, MONTH(FROM_UNIXTIME(timestamp)) as mo, event_type,
                  SUM(CAST(amount AS DECIMAL(38,0))) as total
           FROM stake_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           GROUP BY y, mo, event_type`,
          [...teamAddrs, monthChartStart, chartEnd]
        );
        const [wdMonthRows] = await pool.query(
          `SELECT YEAR(FROM_UNIXTIME(timestamp)) as y, MONTH(FROM_UNIXTIME(timestamp)) as mo,
                  SUM(CAST(amount AS DECIMAL(38,0))) as total
           FROM withdrawal_events
           WHERE LOWER(user_address) IN (${ph}) AND timestamp >= ? AND timestamp < ?
           GROUP BY y, mo`,
          [...teamAddrs, monthChartStart, chartEnd]
        );
        const stakeByMonth = new Map<string, { usdt: bigint; rwa: bigint }>();
        for (const r of stMonthRows as any[]) {
          const ky = `${Number(r.y)}-${String(Number(r.mo)).padStart(2, '0')}`;
          const cur = stakeByMonth.get(ky) || { usdt: 0n, rwa: 0n };
          const t = String(r.event_type || '').toUpperCase();
          const v = BigInt(r.total || 0);
          if (t.includes('USDT')) cur.usdt += v;
          else if (t.includes('RWA')) cur.rwa += v;
          stakeByMonth.set(ky, cur);
        }
        const wdByMonth = new Map<string, bigint>();
        for (const r of wdMonthRows as any[]) {
          const ky = `${Number(r.y)}-${String(Number(r.mo)).padStart(2, '0')}`;
          wdByMonth.set(ky, BigInt(r.total || 0));
        }
        const teamChartMonthly12: { month: string; stakeUsdtEqWei: string; withdrawWei: string }[] = [];
        let cy = y12;
        let cm = mIdx;
        for (let i = 0; i < 12; i++) {
          const key = `${cy}-${String(cm + 1).padStart(2, '0')}`;
          const st = stakeByMonth.get(key) || { usdt: 0n, rwa: 0n };
          const wd = wdByMonth.get(key) || 0n;
          teamChartMonthly12.push({
            month: key,
            stakeUsdtEqWei: stakeToUsdtEq(st.usdt, st.rwa).toString(),
            withdrawWei: wd.toString(),
          });
          cm += 1;
          if (cm > 11) {
            cm = 0;
            cy += 1;
          }
        }

        const [myStakesAgg] = await pool.query(
          `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE LOWER(user_address) = LOWER(?) GROUP BY event_type`,
          [address]
        );
        let myUSDT = 0n;
        let myRWA = 0n;
        (myStakesAgg as any[]).forEach((s) => {
          if (String(s.event_type || '').includes('USDT')) myUSDT += BigInt(s.total || 0);
          else if (String(s.event_type || '').includes('RWA')) myRWA += BigInt(s.total || 0);
        });

        let teamUSDT = 0n;
        let teamRWA = 0n;
        if (downline.length > 0) {
          const ph2 = downline.map(() => '?').join(',');
          const [teamStakesAgg] = await pool.query(
            `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE LOWER(user_address) IN (${ph2}) GROUP BY event_type`,
            downline
          );
          (teamStakesAgg as any[]).forEach((s) => {
            if (String(s.event_type || '').includes('USDT')) teamUSDT += BigInt(s.total || 0);
            else if (String(s.event_type || '').includes('RWA')) teamRWA += BigInt(s.total || 0);
          });
        }

        const myRWAinUSDT = (myRWA * 85n) / 100n;
        const teamRWAinUSDT = (teamRWA * 85n) / 100n;
        const totalTeamVolumeUSDT = myUSDT + myRWAinUSDT + teamUSDT + teamRWAinUSDT;

        const [myWdAgg] = await pool.query(
          `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE LOWER(user_address) = LOWER(?)`,
          [address]
        );
        const myWithdrawn = BigInt((myWdAgg as any[])[0]?.total || 0);
        let teamWithdrawnOnly = 0n;
        if (downline.length > 0) {
          const ph3 = downline.map(() => '?').join(',');
          const [tWdAgg] = await pool.query(
            `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE LOWER(user_address) IN (${ph3})`,
            downline
          );
          teamWithdrawnOnly = BigInt((tWdAgg as any[])[0]?.total || 0);
        }
        const totalWithdrawn = myWithdrawn + teamWithdrawnOnly;
        const teamRetained = totalTeamVolumeUSDT - totalWithdrawn;

        const [memRows] = await pool.query(
          `SELECT LOWER(user_address) as ua, event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total
           FROM stake_events WHERE LOWER(user_address) IN (${ph}) GROUP BY ua, event_type`,
          teamAddrs
        );
        const byUser = new Map<string, { usdt: bigint; rwa: bigint }>();
        for (const r of memRows as any[]) {
          const ua = String(r.ua).toLowerCase();
          const cur = byUser.get(ua) || { usdt: 0n, rwa: 0n };
          const t = String(r.event_type || '').toUpperCase();
          const v = BigInt(r.total || 0);
          if (t.includes('USDT')) cur.usdt += v;
          else if (t.includes('RWA')) cur.rwa += v;
          byUser.set(ua, cur);
        }
        const mappedMembers = teamAddrs.map((ua) => {
          const c = byUser.get(ua) || { usdt: 0n, rwa: 0n };
          return {
            userAddress: ua,
            usdtWei: c.usdt.toString(),
            rwaWei: c.rwa.toString(),
            usdtEqWei: stakeToUsdtEq(c.usdt, c.rwa).toString(),
          };
        });
        const meRow = mappedMembers.find((row) => row.userAddress === me);
        const others = mappedMembers
          .filter((row) => row.userAddress !== me)
          .sort((a, b) => {
            const da = BigInt(a.usdtEqWei);
            const db = BigInt(b.usdtEqWei);
            return da > db ? -1 : da < db ? 1 : 0;
          });
        const memberBreakdown = meRow ? [meRow, ...others.slice(0, 199)] : others.slice(0, 200);

        const result = {
          source: 'database',
          data: {
            dayStart,
            dayEnd,
            directReferrals: directCount,
            teamDownlineCount: downline.length,
            teamTodayStakeUsdtWei: teamTodayStake.usdt.toString(),
            teamTodayStakeRwaWei: teamTodayStake.rwa.toString(),
            teamTodayStakeUsdtEqWei: stakeToUsdtEq(teamTodayStake.usdt, teamTodayStake.rwa).toString(),
            teamTodayWithdrawWei: teamTodayWithdraw.toString(),
            myTodayStakeUsdtWei: myTodayStake.usdt.toString(),
            myTodayStakeRwaWei: myTodayStake.rwa.toString(),
            myTodayStakeUsdtEqWei: stakeToUsdtEq(myTodayStake.usdt, myTodayStake.rwa).toString(),
            myTodayWithdrawWei: myTodayWithdraw.toString(),
            teamVolumeWei: totalTeamVolumeUSDT.toString(),
            teamRetainedWei: teamRetained.toString(),
            teamWithdrawnTotalWei: totalWithdrawn.toString(),
            teamStakesToday: (lstTeamStakesToday as any[]).map((e) => ({
              userAddress: e.user_address,
              eventType: e.event_type,
              amount: String(e.amount),
              timestamp: Number(e.timestamp),
              txHash: e.tx_hash,
            })),
            teamWithdrawsToday: (lstTeamWdToday as any[]).map((e) => ({
              userAddress: e.user_address,
              eventType: e.event_type,
              amount: String(e.amount),
              timestamp: Number(e.timestamp),
              txHash: e.tx_hash,
            })),
            myStakesToday: (lstMyStakesToday as any[]).map((e) => ({
              eventType: e.event_type,
              amount: String(e.amount),
              timestamp: Number(e.timestamp),
              txHash: e.tx_hash,
            })),
            myWithdrawsToday: (lstMyWdToday as any[]).map((e) => ({
              eventType: e.event_type,
              amount: String(e.amount),
              timestamp: Number(e.timestamp),
              txHash: e.tx_hash,
            })),
            weekStart,
            weekEnd,
            monthStart,
            monthEnd,
            teamWeekStakeUsdtWei: teamWeekStake.usdt.toString(),
            teamWeekStakeRwaWei: teamWeekStake.rwa.toString(),
            teamWeekStakeUsdtEqWei: stakeToUsdtEq(teamWeekStake.usdt, teamWeekStake.rwa).toString(),
            teamWeekWithdrawWei: teamWeekWithdraw.toString(),
            teamStakesWeek: (lstTeamStakesWeek as any[]).map((e) => ({
              userAddress: e.user_address,
              eventType: e.event_type,
              amount: String(e.amount),
              timestamp: Number(e.timestamp),
              txHash: e.tx_hash,
            })),
            teamWithdrawsWeek: (lstTeamWdWeek as any[]).map((e) => ({
              userAddress: e.user_address,
              eventType: e.event_type,
              amount: String(e.amount),
              timestamp: Number(e.timestamp),
              txHash: e.tx_hash,
            })),
            teamMonthStakeUsdtWei: teamMonthStake.usdt.toString(),
            teamMonthStakeRwaWei: teamMonthStake.rwa.toString(),
            teamMonthStakeUsdtEqWei: stakeToUsdtEq(teamMonthStake.usdt, teamMonthStake.rwa).toString(),
            teamMonthWithdrawWei: teamMonthWithdraw.toString(),
            teamStakesMonth: (lstTeamStakesMonth as any[]).map((e) => ({
              userAddress: e.user_address,
              eventType: e.event_type,
              amount: String(e.amount),
              timestamp: Number(e.timestamp),
              txHash: e.tx_hash,
            })),
            teamWithdrawsMonth: (lstTeamWdMonth as any[]).map((e) => ({
              userAddress: e.user_address,
              eventType: e.event_type,
              amount: String(e.amount),
              timestamp: Number(e.timestamp),
              txHash: e.tx_hash,
            })),
            teamChartDaily30,
            teamChartMonthly12,
            memberBreakdown,
          },
        };
        setCache(cacheKey, result, OVERVIEW_CACHE_TTL);
        return result;
      }

      case 'withdrawList': {
        const [events] = await pool.query(
          `SELECT event_type, amount, timestamp, tx_hash, block_number FROM withdrawal_events WHERE LOWER(user_address) = LOWER(?) ORDER BY timestamp DESC LIMIT 250`,
          [address]
        );
        const rows = (events as any[]).map((e) => ({
          eventType: e.event_type,
          amount: String(e.amount),
          timestamp: Number(e.timestamp),
          txHash: e.tx_hash,
          blockNumber: e.block_number != null ? Number(e.block_number) : undefined,
        }));
        const result = { source: 'database', data: rows };
        setCache(cacheKey, result);
        return result;
      }
    }
    return { source: 'database', data: null };
  } catch (error) {
    console.error('[UnifiedData] Error:', error);
    return { source: 'database', data: null };
  }
}

router.get('/data/:address/stakes', async (req, res) => {
  try {
    const result = await getUnifiedData(req.params.address, 'userStakes');
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/data/:address/stake-list', async (req, res) => {
  try {
    const result = await getUnifiedData(req.params.address, 'stakeList');
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/data/:address/team', async (req, res) => {
  try {
    const result = await getUnifiedData(req.params.address, 'teamStats');
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/data/:address/referral-network-overview', async (req, res) => {
  try {
    const result = await getUnifiedData(req.params.address, 'referralNetworkOverview');
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/data/:address/withdraw-list', async (req, res) => {
  try {
    const result = await getUnifiedData(req.params.address, 'withdrawList');
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/data/:address/all', async (req, res) => {
  try {
    const [stakes, stakeList, team] = await Promise.all([
      getUnifiedData(req.params.address, 'userStakes'),
      getUnifiedData(req.params.address, 'stakeList'),
      getUnifiedData(req.params.address, 'teamStats'),
    ]);
    res.json({ success: true, stakes, stakeList, team });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 今日静态收益（RWA）：按 rewards 表当天 daily_yield/static 聚合。
 * 仅返回该地址本人数据，供官方客服私聊精确答复使用。
 */
router.get('/data/:address/today-yield', async (req, res) => {
  try {
    const address = String(req.params.address || '').trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return res.status(400).json({ success: false, error: 'invalid address' });
    }
    const pool = getPool();
    const { dayStart, dayEnd } = utcDayRangeSeconds();
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(CAST(amount AS DECIMAL(38,8))), 0) AS totalRwa
       FROM rewards
       WHERE LOWER(user_address) = ?
         AND LOWER(TRIM(COALESCE(reward_type, ''))) IN ('daily_yield', 'static')
         AND timestamp >= FROM_UNIXTIME(?)
         AND timestamp < FROM_UNIXTIME(?)`,
      [address, dayStart, dayEnd]
    );
    const totalRwaRaw = Number((rows as any[])[0]?.totalRwa || 0);
    // rewards.amount stores 18-decimal base unit in many deployments; expose human-readable RWA.
    const totalRwa = totalRwaRaw / 1e18;
    return res.json({
      success: true,
      data: {
        address,
        dayStart,
        dayEnd,
        totalRwa: Number.isFinite(totalRwa) ? Number(totalRwa.toFixed(8)) : 0,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'failed to query today yield' });
  }
});

export default router;
