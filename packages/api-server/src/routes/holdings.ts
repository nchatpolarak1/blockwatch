import { Router } from 'express';
import { z } from 'zod';
import { WATCHLIST_SYMBOLS, assetBySymbol } from '@blockwatch/shared-types';
import { getDemoUserId, prisma } from '../db.js';
import { toHoldingDto } from '../holdingDto.js';

// Only watchlist symbols are accepted: anything else has no price feed behind it
// and would sit in the table permanently unvalued.
const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => assetBySymbol(value) !== undefined, {
    message: `Symbol must be one of: ${WATCHLIST_SYMBOLS.join(', ')}`,
  });

const createSchema = z.object({
  symbol: symbolSchema,
  quantity: z.number().finite().positive(),
  averageCostBasis: z.number().finite().nonnegative(),
});

const updateSchema = z
  .object({
    quantity: z.number().finite().positive().optional(),
    averageCostBasis: z.number().finite().nonnegative().optional(),
  })
  .refine((body) => body.quantity !== undefined || body.averageCostBasis !== undefined, {
    message: 'Provide quantity or averageCostBasis',
  });

export const holdingsRouter = Router();

holdingsRouter.get('/', async (_req, res) => {
  const userId = await getDemoUserId();
  const rows = await prisma.holding.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ holdings: rows.map(toHoldingDto) });
});

holdingsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  const userId = await getDemoUserId();
  const existing = await prisma.holding.findUnique({
    where: { userId_symbol: { userId, symbol: parsed.data.symbol } },
  });

  // One row per symbol, so adding to a position is an explicit edit rather than
  // an implicit merge with ambiguous cost-basis maths.
  if (existing) {
    res.status(409).json({ error: `${parsed.data.symbol} is already held; edit it instead.` });
    return;
  }

  const row = await prisma.holding.create({ data: { userId, ...parsed.data } });
  res.status(201).json(toHoldingDto(row));
});

holdingsRouter.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  const userId = await getDemoUserId();
  const result = await prisma.holding.updateMany({
    where: { id: req.params.id, userId },
    data: parsed.data,
  });

  if (result.count === 0) {
    res.status(404).json({ error: 'Holding not found' });
    return;
  }

  const row = await prisma.holding.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json(toHoldingDto(row));
});

holdingsRouter.delete('/:id', async (req, res) => {
  const userId = await getDemoUserId();
  const result = await prisma.holding.deleteMany({ where: { id: req.params.id, userId } });

  if (result.count === 0) {
    res.status(404).json({ error: 'Holding not found' });
    return;
  }
  res.status(204).end();
});
