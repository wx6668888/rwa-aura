import { createClient } from 'redis';
import logger from '../utils/logger';

const LOCK_KEY = 'rwa:daily_settlement:lock';
const LOCK_TTL_SEC = 7200;

/** 仅封装日结锁用到的 Redis 方法，避免 redis 包泛型版本漂移导致 tsc 报错 */
type RedisLockClient = {
  isOpen: boolean;
  connect(): Promise<void>;
  on(event: 'error', cb: (e: unknown) => void): void;
  set(
    key: string,
    value: string,
    opts: { NX: boolean; EX: number }
  ): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string | string[]): Promise<number>;
};

let sharedClient: RedisLockClient | null = null;

async function getRedis(): Promise<RedisLockClient | null> {
  const host = process.env.REDIS_HOST?.trim();
  const port = process.env.REDIS_PORT?.trim();
  if (!host || !port) return null;
  if (sharedClient?.isOpen) return sharedClient;
  try {
    const c = createClient({ url: `redis://${host}:${port}` }) as unknown as RedisLockClient;
    c.on('error', (e) => logger.error('[SettlementLock] Redis:', e));
    await c.connect();
    sharedClient = c;
    return c;
  } catch (e) {
    logger.warn('[SettlementLock] Redis 连接失败，日结将无分布式锁:', e);
    sharedClient = null;
    return null;
  }
}

/**
 * 多 PM2 实例时仅一个能执行日结；未配置 Redis 时打 warn 并仍执行（须保证 instances=1 或 crontab 单实例）。
 * @returns release 函数；若未获得锁返回 null（调用方应直接跳过本次整批日结）
 */
export async function acquireDailySettlementLock(): Promise<{
  release: () => Promise<void>;
} | null> {
  const redis = await getRedis();
  if (!redis) {
    logger.warn(
      '[SettlementLock] 未配置 Redis 或未连接，日结无跨进程锁。生产请配置 REDIS_HOST/REDIS_PORT 或保证仅单进程跑 Scheduler。'
    );
    return {
      release: async () => {
        /* no-op */
      },
    };
  }

  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const ok = await redis.set(LOCK_KEY, token, { NX: true, EX: LOCK_TTL_SEC });
  if (ok !== 'OK') {
    logger.warn('[SettlementLock] 已有其他实例持有日结锁，本次整批跳过');
    return null;
  }

  return {
    release: async () => {
      try {
        const cur = await redis.get(LOCK_KEY);
        if (cur === token) {
          await redis.del(LOCK_KEY);
        }
      } catch (e) {
        logger.error('[SettlementLock] 释放锁失败:', e);
      }
    },
  };
}
