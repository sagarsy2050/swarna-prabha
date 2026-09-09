import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, assertPasswordStrength } from '../../utils/password.js';

describe('password utils', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('correcthorse1');
    expect(hash).not.toContain('correcthorse1');
    expect(await verifyPassword('correcthorse1', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correcthorse1');
    expect(await verifyPassword('nope', hash)).toBe(false);
  });

  it('verifyPassword is false for missing inputs', async () => {
    expect(await verifyPassword('', 'x')).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
  });

  it('enforces a minimum length', () => {
    expect(() => assertPasswordStrength('short')).toThrow(/at least 8/);
    expect(() => assertPasswordStrength('longenough')).not.toThrow();
  });
});
