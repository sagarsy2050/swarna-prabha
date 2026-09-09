import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Access tokens are JWTs verified statelessly. Refresh tokens are opaque random
 * strings; only their SHA-256 hash is stored (RefreshToken.tokenHash), so a DB
 * leak does not expose usable tokens, and logout / rotation can revoke them.
 */

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl, issuer: 'swarna-prabha' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, { issuer: 'swarna-prabha' });
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Turn a ms/`15m`/`30d` style string into milliseconds. */
export function ttlToMs(ttl) {
  if (typeof ttl === 'number') return ttl;
  const m = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(String(ttl).trim());
  if (!m) throw new Error(`Invalid TTL: ${ttl}`);
  const n = Number(m[1]);
  const unit = m[2] || 'ms';
  return n * { ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[unit];
}

export function refreshExpiryDate() {
  return new Date(Date.now() + ttlToMs(config.jwt.refreshTtl));
}

export default {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  ttlToMs,
  refreshExpiryDate,
};
