'use client';

import { useState } from 'react';
import { WATCHLIST } from '@blockwatch/shared-types';

interface Props {
  heldSymbols: string[];
  onAdd: (symbol: string, quantity: number, averageCostBasis: number) => Promise<void>;
}

export function AddHoldingForm({ heldSymbols, onAdd }: Props) {
  const available = WATCHLIST.filter((asset) => !heldSymbols.includes(asset.symbol));
  const [symbol, setSymbol] = useState(available[0]?.symbol ?? '');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (available.length === 0) {
    return <p className="empty">Every watchlist asset is already in the portfolio.</p>;
  }

  const chosen = available.some((asset) => asset.symbol === symbol) ? symbol : available[0]!.symbol;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onAdd(chosen, Number(quantity), Number(cost));
      setQuantity('');
      setCost('');
    } finally {
      setSubmitting(false);
    }
  };

  const valid = Number(quantity) > 0 && Number(cost) >= 0 && cost !== '';

  return (
    <form className="add-row" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="symbol">Asset</label>
        <select id="symbol" value={chosen} onChange={(e) => setSymbol(e.target.value)}>
          {available.map((asset) => (
            <option key={asset.symbol} value={asset.symbol}>
              {asset.symbol} — {asset.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="quantity">Quantity</label>
        <input
          id="quantity"
          type="number"
          step="any"
          min="0"
          placeholder="0.75"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="cost">Average cost (USD)</label>
        <input
          id="cost"
          type="number"
          step="any"
          min="0"
          placeholder="61200"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>
      <button type="submit" className="primary" disabled={!valid || submitting}>
        {submitting ? 'Adding…' : 'Add position'}
      </button>
    </form>
  );
}
