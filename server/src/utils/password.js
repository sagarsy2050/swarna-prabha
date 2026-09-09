import bcrypt from 'bcryptjs';

const COST = 12;

/** Minimum password policy, kept in one place so the API and tests agree. */
export function assertPasswordStrength(pw) {
  if (typeof pw !== 'string' || pw.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
}

export async function hashPassword(plain) {
  assertPasswordStrength(plain);
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

export default { hashPassword, verifyPassword, assertPasswordStrength };
