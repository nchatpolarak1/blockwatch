import { getDemoUserId, prisma } from '../src/db.js';

const STARTER_POSITIONS = [
  { symbol: 'BTC', quantity: 0.75, averageCostBasis: 61200 },
  { symbol: 'ETH', quantity: 6.5, averageCostBasis: 2840 },
  { symbol: 'SOL', quantity: 120, averageCostBasis: 88.4 },
];

const userId = await getDemoUserId();

for (const position of STARTER_POSITIONS) {
  await prisma.holding.upsert({
    where: { userId_symbol: { userId, symbol: position.symbol } },
    update: {},
    create: { userId, ...position },
  });
}

console.log(`Seeded ${STARTER_POSITIONS.length} holdings for the demo user.`);
await prisma.$disconnect();
