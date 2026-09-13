import { summarizePortfolio, valueHolding, type PortfolioSummary } from '@blockwatch/shared-types';
import { getDemoUserId, prisma } from '../db.js';
import { toHoldingDto } from '../holdingDto.js';
import { readCachedTickMap } from '../redis.js';

/**
 * Values every holding against the last tick the ingestor cached. The maths lives
 * in shared-types so the browser can recompute the same numbers as prices stream
 * in, instead of re-fetching this endpoint on every tick.
 */
export async function buildPortfolio(): Promise<PortfolioSummary> {
  const userId = await getDemoUserId();

  const [rows, ticks] = await Promise.all([
    prisma.holding.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    readCachedTickMap(),
  ]);

  const valuations = rows.map((row) => {
    const holding = toHoldingDto(row);
    return valueHolding(holding, ticks.get(holding.symbol) ?? null);
  });

  return summarizePortfolio(valuations);
}
