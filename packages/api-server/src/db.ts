import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

export const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl });

const DEMO_EMAIL = 'demo@blockwatch.local';
let cachedDemoUserId: string | null = null;

/**
 * Stands in for the authenticated user until auth lands. Creating on demand means
 * a fresh database works without having to remember to run the seed first.
 */
export async function getDemoUserId(): Promise<string> {
  if (cachedDemoUserId) return cachedDemoUserId;

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL },
  });

  cachedDemoUserId = user.id;
  return user.id;
}
