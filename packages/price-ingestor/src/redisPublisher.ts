import Redis from 'ioredis';
import { PRICE_CHANNEL, priceCacheKey, type PriceTick } from '@blockwatch/shared-types';

/** Long enough that a brief ingestor restart keeps serving snapshots, short enough
 * that a feed which stays down does not hand out day-old prices forever. */
const CACHE_TTL_SECONDS = 3600;

export class PricePublisher {
  private readonly redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url);
    this.redis.on('error', (err) => console.error(`[redis] ${err.message}`));
  }

  /** Caches the tick for late-joining clients and fans it out in a single round trip. */
  async publish(tick: PriceTick): Promise<void> {
    const payload = JSON.stringify(tick);
    await this.redis
      .pipeline()
      .set(priceCacheKey(tick.symbol), payload, 'EX', CACHE_TTL_SECONDS)
      .publish(PRICE_CHANNEL, payload)
      .exec();
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
