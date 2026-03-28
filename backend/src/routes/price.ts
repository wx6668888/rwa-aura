import express from 'express';
import { createClient } from 'redis';
import { ethers } from 'ethers';
import { getPool } from '../config/database.config';
import logger from '../utils/logger';

const router = express.Router();

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedis() {
  const host = process.env.REDIS_HOST?.trim();
  const port = process.env.REDIS_PORT?.trim();
  if (!host || !port) return null;

  if (redisClient?.isOpen) return redisClient;

  try {
    const client = createClient({ url: `redis://${host}:${port}` });
    client.on('error', (e) => logger.error('[price/rwa] Redis error:', e));
    await client.connect();
    redisClient = client;
    return client;
  } catch (e) {
    logger.warn('[price/rwa] Redis connect failed:', e);
    redisClient = null;
    return null;
  }
}

/**
 * RWA/USDT 价格：优先读 PriceOracle 写入的 Redis；失败则读 homepage_stats.price。
 * data.price 为人类可读数字（与现有前端 useRwaPrice 一致）；data.priceWei 为 18 位整数字符串。
 */
router.get('/price/rwa', async (_req, res) => {
  try {
    const redis = await getRedis();
    if (redis?.isOpen) {
      const raw = await redis.get('rwa_price');
      if (raw) {
        const parsed = JSON.parse(raw) as { price?: string; timestamp?: number };
        const wei = parsed.price;
        if (wei && /^\d+$/.test(wei)) {
          const human = parseFloat(ethers.formatUnits(wei, 18));
          if (Number.isFinite(human) && human > 0) {
            return res.json({
              success: true,
              data: {
                price: human,
                priceWei: wei,
                timestamp: new Date(parsed.timestamp ?? Date.now()).toISOString(),
              },
            });
          }
        }
      }
    }

    const pool = getPool();
    const [rows]: any = await pool.query('SELECT price FROM homepage_stats WHERE id = 1');
    const dbPrice = rows?.length ? Number(rows[0].price ?? 0.85) : 0.85;
    const safe = Number.isFinite(dbPrice) && dbPrice > 0 ? dbPrice : 0.85;
    const wei = ethers.parseUnits(safe.toFixed(18), 18).toString();

    return res.json({
      success: true,
      data: {
        price: safe,
        priceWei: wei,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    logger.error('[price/rwa]', e);
    return res.status(500).json({ success: false, error: 'Price not available' });
  }
});

export default router;
