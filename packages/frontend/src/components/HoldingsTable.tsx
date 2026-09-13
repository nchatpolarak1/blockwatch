'use client';

import type { HoldingValuation } from '@blockwatch/shared-types';
import { LivePrice } from '@/components/LivePrice';
import { formatAge, formatPct, formatQuantity, formatSignedUsd, formatUsd } from '@/lib/format';

interface Props {
  holdings: HoldingValuation[];
  now: number;
  onRemove: (id: string) => void;
  busyId: string | null;
}

export function HoldingsTable({ holdings, now, onRemove, busyId }: Props) {
  if (holdings.length === 0) {
    return <p className="empty">No positions yet. Add one below to start tracking it live.</p>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Quantity</th>
            <th>Avg cost</th>
            <th>Price</th>
            <th>24h</th>
            <th>Market value</th>
            <th>Unrealized P&amp;L</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const pnlClass = (holding.unrealizedPnl ?? 0) >= 0 ? 'up' : 'down';
            const dayClass = (holding.changePct24h ?? 0) >= 0 ? 'up' : 'down';

            return (
              <tr key={holding.id}>
                <td>
                  <div className="asset">
                    <span className="sym">{holding.symbol}</span>
                    <span className="name">{holding.name}</span>
                  </div>
                </td>
                <td>{formatQuantity(holding.quantity)}</td>
                <td>{formatUsd(holding.averageCostBasis)}</td>
                <td>
                  <LivePrice value={holding.price} />
                  <div className="age">{formatAge(holding.priceTimestamp, now)}</div>
                </td>
                <td className={holding.changePct24h === null ? 'muted' : dayClass}>
                  {formatPct(holding.changePct24h)}
                </td>
                <td>{formatUsd(holding.marketValue)}</td>
                <td className={holding.unrealizedPnl === null ? 'muted' : pnlClass}>
                  <div>{formatSignedUsd(holding.unrealizedPnl)}</div>
                  <div className="age">{formatPct(holding.unrealizedPnlPct)}</div>
                </td>
                <td>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => onRemove(holding.id)}
                    disabled={busyId === holding.id}
                  >
                    {busyId === holding.id ? '…' : 'Remove'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
