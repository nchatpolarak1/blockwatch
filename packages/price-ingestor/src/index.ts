import type { PriceTick } from '@blockwatch/shared-types';
import { BinanceStreamClient, type BookUpdate } from './binanceClient.js';
import { config } from './config.js';
import { DailyStatsTracker } from './dailyStats.js';
import { PricePublisher } from './redisPublisher.js';

const publisher = new PricePublisher(config.redisUrl);
const dailyStats = new DailyStatsTracker();

let ticksSinceRollup = 0;
const latest = new Map<string, number>();

const client = new BinanceStreamClient((update: BookUpdate) => {
  const open24h = dailyStats.openFor(update.pair);

  const tick: PriceTick = {
    symbol: update.symbol,
    pair: update.pair,
    price: update.mid,
    bid: update.bid,
    ask: update.ask,
    open24h,
    changePct24h: open24h ? ((update.mid - open24h) / open24h) * 100 : null,
    timestamp: Date.now(),
  };

  ticksSinceRollup += 1;
  latest.set(tick.symbol, tick.price);
  publisher.publish(tick).catch((err: Error) => {
    console.error(`[redis] failed to publish ${tick.symbol}: ${err.message}`);
  });
});

// Per-tick logging would flood the console at several updates a second, so roll it up.
const rollup = setInterval(() => {
  if (ticksSinceRollup === 0) {
    console.warn('[ingestor] no ticks received in the last interval');
    return;
  }
  const prices = [...latest.entries()]
    .map(([symbol, price]) => `${symbol} ${price.toLocaleString('en-US')}`)
    .join('  ');
  console.log(`[ingestor] published ${ticksSinceRollup} ticks  ${prices}`);
  ticksSinceRollup = 0;
}, config.logRollupMs);

await dailyStats.start();
client.start();

async function shutdown(signal: string): Promise<void> {
  console.log(`[ingestor] ${signal} received, shutting down`);
  clearInterval(rollup);
  dailyStats.stop();
  client.stop();
  await publisher.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
