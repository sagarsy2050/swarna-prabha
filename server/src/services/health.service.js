import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';

/**
 * Application health. Shallow by default; `?deep=1` additionally pings the
 * database. No internal configuration or secrets are exposed.
 */
export async function health({ deep = false } = {}) {
  const out = {
    status: 'ok',
    env: config.env,
    time: new Date().toISOString(),
    checks: {},
  };

  if (deep) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      out.checks.database = { ok: true };
    } catch {
      out.checks.database = { ok: false };
      out.status = 'degraded';
    }
  }

  out.checks.storage = { ok: true, driver: config.storage.driver };
  out.checks.payment = { ok: true, driver: config.payment.driver };

  return out;
}

export default health;
