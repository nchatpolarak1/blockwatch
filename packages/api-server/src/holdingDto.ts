import type { Prisma } from '@prisma/client';
import type { Holding } from '@blockwatch/shared-types';

type HoldingRow = Prisma.HoldingGetPayload<object>;

/** Prisma hands back Decimals; the wire contract speaks numbers. */
export function toHoldingDto(row: HoldingRow): Holding {
  return {
    id: row.id,
    symbol: row.symbol,
    quantity: row.quantity.toNumber(),
    averageCostBasis: row.averageCostBasis.toNumber(),
    createdAt: row.createdAt.toISOString(),
  };
}
