'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  summarizePortfolio,
  valueHolding,
  type Holding,
  type PortfolioSummary,
} from '@blockwatch/shared-types';
import { AddHoldingForm } from '@/components/AddHoldingForm';
import { HoldingsTable } from '@/components/HoldingsTable';
import { SummaryCards } from '@/components/SummaryCards';
import { usePriceSocket, type ConnectionStatus } from '@/hooks/usePriceSocket';
import { createHolding, deleteHolding, fetchPortfolio } from '@/services/holdingsApi';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting',
  live: 'Live',
  reconnecting: 'Reconnecting',
};

/** Ticks once a second purely so the "last updated" ages stay honest. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function Dashboard() {
  const { ticks, status } = usePriceSocket();
  const now = useNow();

  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [serverSummary, setServerSummary] = useState<PortfolioSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const summary = await fetchPortfolio();
    setServerSummary(summary);
    setHoldings(
      summary.holdings.map(({ id, symbol, quantity, averageCostBasis, createdAt }) => ({
        id,
        symbol,
        quantity,
        averageCostBasis,
        createdAt,
      })),
    );
  }, []);

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [load]);

  // The server values the portfolio on load; once ticks arrive the browser reruns
  // the same shared calculation so the numbers move without refetching.
  const summary = useMemo(() => {
    if (!holdings) return null;
    if (ticks.size === 0) return serverSummary;
    return summarizePortfolio(
      holdings.map((holding) => valueHolding(holding, ticks.get(holding.symbol) ?? null)),
    );
  }, [holdings, ticks, serverSummary]);

  const handleAdd = async (symbol: string, quantity: number, averageCostBasis: number) => {
    setError(null);
    try {
      await createHolding({ symbol, quantity, averageCostBasis });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRemove = async (id: string) => {
    setError(null);
    setRemovingId(id);
    try {
      await deleteHolding(id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <div className="masthead">
        <h1>Blockwatch</h1>
        <span className="status" data-state={status}>
          <span className="dot" />
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="tagline">
        Crypto positions marked to live exchange prices, streamed over WebSocket.
      </p>

      {summary ? <SummaryCards summary={summary} /> : null}

      <section className="panel">
        <div className="panel-head">
          <h2>Positions</h2>
          {summary && summary.unpricedSymbols.length > 0 ? (
            <span className="muted">Awaiting prices: {summary.unpricedSymbols.join(', ')}</span>
          ) : null}
        </div>

        {error ? <p className="notice">{error}</p> : null}

        {summary ? (
          <HoldingsTable
            holdings={summary.holdings}
            now={now}
            onRemove={handleRemove}
            busyId={removingId}
          />
        ) : (
          <p className="empty">Loading portfolio…</p>
        )}

        <AddHoldingForm
          heldSymbols={(holdings ?? []).map((holding) => holding.symbol)}
          onAdd={handleAdd}
        />
      </section>

      <p className="footnote">
        Positions are marked at the mid of the best bid and ask. Quiet symbols keep their last
        traded price — the timestamp under each price says how fresh it is.
      </p>
    </>
  );
}
