// [Logic Memory] 1 RWA = 0.85 USDT. Timestamp in seconds (Unix timestamp).
import express from 'express';
import { ethers } from 'ethers';
import { getPool } from '../config/database.config';

const router = express.Router();
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5000;

function getCache(key: string) {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) return item.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
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
        const result = {
          source: 'database',
          data: {
            usdtStaked: (eventsArray.find(e => e.event_type.includes('USDT'))?.total || '0'),
            rwaStaked: (eventsArray.find(e => e.event_type.includes('RWA'))?.total || '0'),
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
          `SELECT event_type, amount, UNIX_TIMESTAMP(timestamp) as timestamp, lock_period, block_number FROM stake_events WHERE LOWER(user_address) = LOWER(?) ORDER BY timestamp DESC`,
          [address]
        );
        const stakes = (events as any[]).map((e: any) => ({
          stakeId: `${e.event_type}_${e.timestamp}`,
          amount: e.amount,
          timestamp: e.timestamp,
          lockPeriod: e.lock_period === 0 ? 'flexible' : String(e.lock_period),
          assetType: e.event_type.includes('USDT') ? 'USDT' : 'RWA',
        }));
        const result = { source: 'database', data: stakes };
        setCache(cacheKey, result);
        return result;
      }
      
      case 'teamStats': {
        const [referrals] = await pool.query(
          `SELECT DISTINCT user_address FROM referral_bindings WHERE LOWER(referrer_address) = LOWER(?)`,
          [address]
        );
        const referralAddresses = (referrals as any[]).map(r => r.user_address.toLowerCase());
        
        const [myStakes] = await pool.query(
          `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE LOWER(user_address) = LOWER(?) GROUP BY event_type`,
          [address]
        );
        let myUSDT = 0n, myRWA = 0n;
        (myStakes as any[]).forEach(s => {
          if (s.event_type.includes('USDT')) myUSDT += BigInt(s.total || 0);
          else if (s.event_type.includes('RWA')) myRWA += BigInt(s.total || 0);
        });
        
        let teamUSDT = 0n, teamRWA = 0n;
        if (referralAddresses.length > 0) {
          const placeholders = referralAddresses.map(() => '?').join(',');
          const [teamStakes] = await pool.query(
            `SELECT event_type, SUM(CAST(amount AS DECIMAL(38,0))) as total FROM stake_events WHERE LOWER(user_address) IN (${placeholders}) GROUP BY event_type`,
            referralAddresses
          );
          (teamStakes as any[]).forEach(s => {
            if (s.event_type.includes('USDT')) teamUSDT += BigInt(s.total || 0);
            else if (s.event_type.includes('RWA')) teamRWA += BigInt(s.total || 0);
          });
        }
        
        const myRWAinUSDT = (myRWA * 85n) / 100n;
        const teamRWAinUSDT = (teamRWA * 85n) / 100n;
        const totalTeamVolumeUSDT = myUSDT + myRWAinUSDT + teamUSDT + teamRWAinUSDT;
        
        // Calculate total withdrawn (gross amount before fees)
        const [myWithdrawals] = await pool.query(
          `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE LOWER(user_address) = LOWER(?)`,
          [address]
        );
        const myWithdrawn = BigInt((myWithdrawals as any[])[0]?.total || 0);
        
        let teamWithdrawn = 0n;
        if (referralAddresses.length > 0) {
          const placeholders = referralAddresses.map(() => '?').join(',');
          const [teamWithdrawals] = await pool.query(
            `SELECT SUM(CAST(amount AS DECIMAL(38,0))) as total FROM withdrawal_events WHERE LOWER(user_address) IN (${placeholders})`,
            referralAddresses
          );
          teamWithdrawn = BigInt((teamWithdrawals as any[])[0]?.total || 0);
        }
        
        const totalWithdrawn = myWithdrawn + teamWithdrawn;
        const teamRetained = totalTeamVolumeUSDT - totalWithdrawn;
        
        const result = {
          source: 'database',
          data: {
            directReferrals: referralAddresses.length,
            teamVolume: totalTeamVolumeUSDT.toString(),
            teamRetained: teamRetained.toString(),
          }
        };
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

export default router;
