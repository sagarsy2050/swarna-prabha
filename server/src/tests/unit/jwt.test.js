import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  ttlToMs,
} from '../../utils/jwt.js';

describe('jwt utils', () => {
  it('signs and verifies an access token with claims', () => {
    const token = signAccessToken({ id: 'u1', role: 'CUSTOMER', email: 'a@b.c' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.iss).toBe('swarna-prabha');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken({ id: 'u1', role: 'CUSTOMER', email: 'a@b.c' });
    expect(() => verifyAccessToken(`${token}x`)).toThrow();
  });

  it('refresh tokens are opaque and hashed deterministically', () => {
    const raw = generateRefreshToken();
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toBe(raw);
  });

  it('parses TTL strings to ms', () => {
    expect(ttlToMs('15m')).toBe(900_000);
    expect(ttlToMs('30d')).toBe(2_592_000_000);
    expect(ttlToMs('500')).toBe(500);
    expect(() => ttlToMs('banana')).toThrow();
  });
});
