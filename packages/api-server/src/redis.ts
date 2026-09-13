import Redis from 'ioredis';
import { WATCHLIST, priceCacheKey, type PriceTick } from '@blockwatch/shared-types';
import { config } from './config.js';

/**
 * A Redis connection in subscriber mode refuses ordinary commands, so the cache
 * reads and the pub/sub subscription each need their own connection.
 */
export const redis = new Redis(config.redisUrl);
export const subscriber = new Redis(config.redisUrl);

redis.on('error', (err) => console.error(`[redis] command client: ${err.message}`));
subscriber.on('error', (err) => console.error(`[redis] subscriber: ${err.message}`));

/** Last known tick per watchlist symbol, skipping any the ingestor has not seen yet. */
export async function readCachedTicks(): Promise<PriceTick[]> {
  const keys = WATCHLIST.map((asset) => priceCacheKey(asset.symbol));
  const payloads = await redis.mget(keys);

  const ticks: PriceTick[] = [];
  for (const payload of payloads) {
    if (!payload) continue;
    try {
      ticks.push(JSON.parse(payload) as PriceTick);
    } catch {
      console.warn('[redis] skipped malformed cached tick');
    }
  }
  return ticks;
}

/** Cached ticks keyed by symbol, for joining against holdings. */
export async function readCachedTickMap(): Promise<Map<string, PriceTick>> {
  const ticks = await readCachedTicks();
  return new Map(ticks.map((tick) => [tick.symbol, tick]));
}

export async function closeRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), subscriber.quit()]);
}
