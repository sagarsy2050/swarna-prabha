import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

/**
 * One PrismaClient for the process. `--watch` in dev re-runs the whole file on
 * change, so guard against multiple instances leaking connections.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__swarnaPrabhaPrisma ??
  new PrismaClient({
    log: config.isProd ? ['error', 'warn'] : ['error', 'warn'],
  });

if (!config.isProd) globalForPrisma.__swarnaPrabhaPrisma = prisma;

export default prisma;
