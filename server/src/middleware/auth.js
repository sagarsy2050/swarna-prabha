import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../lib/prisma.js';

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

/**
 * Require a valid access token. Attaches `req.user = { id, role, email }`.
 * The token is verified statelessly; `isActive` is re-checked against the DB so
 * a disabled account cannot keep using a token that has not expired yet.
 */
export async function authenticate(req, _res, next) {
  try {
    const token = bearer(req);
    if (!token) throw ApiError.unauthorized('Missing bearer token');
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');
    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth: attaches req.user when a valid token is present, never errors. */
export async function optionalAuth(req, _res, next) {
  const token = bearer(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true, isActive: true },
    });
    if (user && user.isActive) req.user = { id: user.id, role: user.role, email: user.email };
  } catch {
    /* ignore — treated as anonymous */
  }
  next();
}

/** Gate a route to one or more roles. Use after `authenticate`. */
export function requireRole(...roles) {
  const allowed = new Set(roles.flat());
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.has(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${[...allowed].join(' or ')}`));
    }
    next();
  };
}

export const isAdmin = (req) => req.user?.role === 'ADMIN';

export default { authenticate, optionalAuth, requireRole, isAdmin };
