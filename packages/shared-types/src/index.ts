/**
 * The wire contract shared by the ingestor, the API server and the browser.
 * Importing the same module in all three means a change to a message shape
 * breaks the typecheck instead of silently breaking the dashboard.
 */

export interface WatchlistAsset {
  /** What a user holds and what we persist, e.g. "BTC". */
  symbol: string;
  /** The Binance market symbol we subscribe to, e.g. "BTCUSDT". */
  pair: string;
  name: string;
}

export const WATCHLIST: readonly WatchlistAsset[] = [
  { symbol: 'BTC', pair: 'BTCUSDT', name: 'Bitcoin' },
  { symbol: 'ETH', pair: 'ETHUSDT', name: 'Ethereum' },
  { symbol: 'SOL', pair: 'SOLUSDT', name: 'Solana' },
  { symbol: 'XRP', pair: 'XRPUSDT', name: 'XRP' },
  { symbol: 'DOGE', pair: 'DOGEUSDT', name: 'Dogecoin' },
];

export const WATCHLIST_SYMBOLS: readonly string[] = WATCHLIST.map((a) => a.symbol);

const BY_SYMBOL = new Map(WATCHLIST.map((a) => [a.symbol, a]));
const BY_PAIR = new Map(WATCHLIST.map((a) => [a.pair, a]));

export function assetBySymbol(symbol: string): WatchlistAsset | undefined {
  return BY_SYMBOL.get(symbol.toUpperCase());
}

export function assetByPair(pair: string): WatchlistAsset | undefined {
  return BY_PAIR.get(pair.toUpperCase());
}

export interface PriceTick {
  symbol: string;
  pair: string;
  /** Mid of the best bid and ask — the mark price we value holdings at. */
  price: number;
  bid: number;
  ask: number;
  /** 24h rolling open from the REST poll; null until the first poll lands. */
  open24h: number | null;
  changePct24h: number | null;
  /** Ingest time, epoch ms. The book stream carries no exchange timestamp. */
  timestamp: number;
}

/** Messages the API server pushes to the browser. */
export type ServerMessage =
  | { type: 'snapshot'; ticks: PriceTick[] }
  | { type: 'tick'; tick: PriceTick };

/** Redis pub/sub channel carrying every tick from ingestor to API server. */
export const PRICE_CHANNEL = 'prices';

/** Redis key holding the last known tick per symbol, so a new client gets prices immediately. */
export function priceCacheKey(symbol: string): string {
  return `price:${symbol.toUpperCase()}`;
}

export interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  averageCostBasis: number;
  createdAt: string;
}

export interface HoldingValuation extends Holding {
  name: string;
  /** null until a tick for this symbol has been seen. */
  price: number | null;
  marketValue: number | null;
  costTotal: number;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  changePct24h: number | null;
  priceTimestamp: number | null;
}

export interface PortfolioSummary {
  holdings: HoldingValuation[];
  totalMarketValue: number;
  totalCost: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
  /** When this valuation was computed, epoch ms. */
  pricedAt: number;
  /** Symbols with no cached price; their valuation fields are null. */
  unpricedSymbols: string[];
}

export interface CreateHoldingRequest {
  symbol: string;
  quantity: number;
  averageCostBasis: number;
}

/**
 * Single source of truth for valuation maths. The API server calls this to build
 * the authoritative response; the browser calls it again on every tick to keep the
 * table live between fetches, so the two can never drift apart.
 */
export function valueHolding(holding: Holding, tick: PriceTick | null): HoldingValuation {
  const asset = assetBySymbol(holding.symbol);
  const costTotal = holding.quantity * holding.averageCostBasis;

  if (!tick) {
    return {
      ...holding,
      name: asset?.name ?? holding.symbol,
      price: null,
      marketValue: null,
      costTotal,
      unrealizedPnl: null,
      unrealizedPnlPct: null,
      changePct24h: null,
      priceTimestamp: null,
    };
  }

  const marketValue = holding.quantity * tick.price;
  const unrealizedPnl = marketValue - costTotal;

  return {
    ...holding,
    name: asset?.name ?? holding.symbol,
    price: tick.price,
    marketValue,
    costTotal,
    unrealizedPnl,
    unrealizedPnlPct: costTotal > 0 ? (unrealizedPnl / costTotal) * 100 : null,
    changePct24h: tick.changePct24h,
    priceTimestamp: tick.timestamp,
  };
}

export function summarizePortfolio(valuations: HoldingValuation[]): PortfolioSummary {
  let totalMarketValue = 0;
  let totalCost = 0;
  const unpricedSymbols: string[] = [];

  // Unpriced holdings are left out of both totals: counting their cost while their
  // market value is unknown would report a loss the user does not actually have.
  for (const v of valuations) {
    if (v.marketValue === null) {
      unpricedSymbols.push(v.symbol);
      continue;
    }
    totalCost += v.costTotal;
    totalMarketValue += v.marketValue;
  }

  const totalUnrealizedPnl = totalMarketValue - totalCost;

  return {
    holdings: valuations,
    totalMarketValue,
    totalCost,
    totalUnrealizedPnl,
    totalUnrealizedPnlPct: totalCost > 0 ? (totalUnrealizedPnl / totalCost) * 100 : 0,
    pricedAt: Date.now(),
    unpricedSymbols,
  };
}
