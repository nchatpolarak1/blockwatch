import { WATCHLIST } from '@blockwatch/shared-types';
import { config } from './config.js';

interface DailyStatsResponse {
  symbol: string;
  openPrice: string;
}

/**
 * The book stream carries only bid/ask, so the 24h open comes from REST instead.
 * It moves once a day, which makes it reference data to poll rather than a delta
 * to stream — the live price still arrives over the socket.
 */
export class DailyStatsTracker {
  private readonly opens = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    await this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, config.dailyStatsRefreshMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  openFor(pair: string): number | null {
    return this.opens.get(pair) ?? null;
  }

  private async refresh(): Promise<void> {
    const pairs = WATCHLIST.map((a) => a.pair);
    const url = `${config.binanceRestBase}/api/v3/ticker/24hr?symbols=${encodeURIComponent(
      JSON.stringify(pairs),
    )}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const rows = (await response.json()) as DailyStatsResponse[];
      for (const row of rows) {
        const open = Number(row.openPrice);
        if (Number.isFinite(open) && open > 0) {
          this.opens.set(row.symbol, open);
        }
      }
    } catch (err) {
      // Keep the previous opens; a failed poll costs us a stale change%, not the feed.
      console.error(`[stats] 24h refresh failed: ${(err as Error).message}`);
    }
  }
}
