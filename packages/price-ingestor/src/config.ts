import { resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true });

export const config = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
  /**
   * Public market data needs no API key, so there is no credential to leak.
   * Defaults to the US endpoints because the global ones answer 451 from US IPs;
   * the payloads are identical, so override these to run elsewhere.
   */
  binanceWsBase: process.env.BINANCE_WS_BASE ?? 'wss://stream.binance.us:9443',
  binanceRestBase: process.env.BINANCE_REST_BASE ?? 'https://api.binance.us',
  /** The 24h open barely moves, so polling it a minute apart is plenty. */
  dailyStatsRefreshMs: 60_000,
  /** Book updates arrive several times a second across the watchlist; a full
   * minute of silence means the socket is dead rather than merely quiet. */
  staleSocketMs: 60_000,
  logRollupMs: 10_000,
} as const;
