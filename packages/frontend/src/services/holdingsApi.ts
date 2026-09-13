import type { CreateHoldingRequest, Holding, PortfolioSummary } from '@blockwatch/shared-types';
import { API_URL } from '@/lib/config';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export function fetchPortfolio(): Promise<PortfolioSummary> {
  return request<PortfolioSummary>('/api/portfolio');
}

export function fetchHoldings(): Promise<Holding[]> {
  return request<{ holdings: Holding[] }>('/api/holdings').then((body) => body.holdings);
}

export function createHolding(payload: CreateHoldingRequest): Promise<Holding> {
  return request<Holding>('/api/holdings', { method: 'POST', body: JSON.stringify(payload) });
}

export function deleteHolding(id: string): Promise<void> {
  return request<void>(`/api/holdings/${id}`, { method: 'DELETE' });
}
