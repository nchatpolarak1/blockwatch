import type { PortfolioSummary } from '@blockwatch/shared-types';
import { formatPct, formatSignedUsd, formatUsd } from '@/lib/format';

export function SummaryCards({ summary }: { summary: PortfolioSummary }) {
  const pnlClass = summary.totalUnrealizedPnl >= 0 ? 'up' : 'down';

  return (
    <section className="cards">
      <div className="card">
        <div className="label">Market value</div>
        <div className="value">{formatUsd(summary.totalMarketValue)}</div>
        <div className="sub">{summary.holdings.length} positions</div>
      </div>
      <div className="card">
        <div className="label">Cost basis</div>
        <div className="value">{formatUsd(summary.totalCost)}</div>
        <div className="sub">what you paid</div>
      </div>
      <div className="card">
        <div className="label">Unrealized P&amp;L</div>
        <div className={`value ${pnlClass}`}>{formatSignedUsd(summary.totalUnrealizedPnl)}</div>
        <div className={`sub ${pnlClass}`}>{formatPct(summary.totalUnrealizedPnlPct)}</div>
      </div>
    </section>
  );
}
