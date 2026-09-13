/** Crypto prices span BTC at five figures and DOGE at fractions of a cent. */
export function formatPrice(value: number | null): string {
  if (value === null) return '—';
  const decimals = value >= 100 ? 2 : value >= 1 ? 4 : 6;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatUsd(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSignedUsd(value: number | null): string {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : '−'}${formatUsd(Math.abs(value))}`;
}

export function formatPct(value: number | null): string {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%`;
}

export function formatQuantity(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

export function formatAge(timestamp: number | null, now: number): string {
  if (timestamp === null) return 'no data';
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
