import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

/**
 * True when the configured Postgres is reachable AND the schema has been applied
 * — integration tests gate on this so they skip (not fail) on a fresh machine or
 * before `prisma migrate deploy` has run against the test database.
 */
export async function dbReachable() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [{ ok }] = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public."User"') IS NOT NULL AS ok`,
    );
    return ok === true;
  } catch {
    return false;
  }
}

const TABLES = [
  'Payment',
  'OrderItem',
  'Order',
  'CartItem',
  'Cart',
  'Appointment',
  'ProductImage',
  'Product',
  'JewelleryCategory',
  'InventoryItem',
  'FileObject',
  'RefreshToken',
  'PasswordResetToken',
  'CustomerProfile',
  'JewellerProfile',
  'User',
];

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`,
  );
}

export async function makeUser({ email, role = 'CUSTOMER', password = 'password123', fullName }) {
  const slug = `shop-${email.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 4),
      role,
      fullName: fullName || email,
      ...(role === 'CUSTOMER' ? { customerProfile: { create: {} } } : {}),
      ...(role === 'JEWELLER'
        ? { jewellerProfile: { create: { shopName: `${fullName || email} Shop`, slug } } }
        : {}),
    },
  });
}

/** supertest agent bound to a freshly created app. */
export async function buildTestApp() {
  const { createApp } = await import('../app.js');
  return createApp();
}

export async function login(agent, email, password) {
  const res = await agent.post('/api/auth/login').send({ email, password });
  return res.body?.data?.accessToken;
}
