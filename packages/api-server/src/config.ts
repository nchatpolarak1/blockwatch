import { resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(import.meta.dirname, '../../../.env'), quiet: true });

export const config = {
  port: Number(process.env.PORT ?? 4000),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://blockwatch:blockwatch@localhost:5432/blockwatch?schema=public',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  /** Drop clients that stop answering pings so we do not broadcast into dead sockets. */
  heartbeatMs: 30_000,
} as const;
