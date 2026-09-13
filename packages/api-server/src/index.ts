import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { closeRedis, readCachedTicks } from './redis.js';
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

const server = createServer(app);
const stopBroadcaster = attachPriceBroadcaster(server);

server.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port} (ws on /ws)`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[api] ${signal} received, shutting down`);
  stopBroadcaster();
  server.close();
  await closeRedis();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
