import { createServer } from 'node:http';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.js';
import { prisma } from './db.js';
import { closeRedis, readCachedTicks } from './redis.js';
import { holdingsRouter } from './routes/holdings.js';
import { attachPriceBroadcaster } from './ws/priceBroadcaster.js';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/prices', async (_req, res) => {
  res.json({ ticks: await readCachedTicks() });
});

app.use('/api/holdings', holdingsRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[api] unhandled: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

const server = createServer(app);
const stopBroadcaster = attachPriceBroadcaster(server);

server.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port} (ws on /ws)`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[api] ${signal} received, shutting down`);
  stopBroadcaster();
  server.close();
  await Promise.allSettled([closeRedis(), prisma.$disconnect()]);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
