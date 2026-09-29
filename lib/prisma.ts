import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Connect through node-postgres instead of Prisma's built-in engine: Node tries
// IPv4 and IPv6 in parallel (Happy Eyeballs), so a broken IPv6 route to Neon
// no longer makes connections time out.
function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15_000,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
