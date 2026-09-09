/**
 * Prisma returns `Decimal` objects and `Date`s. JSON.stringify handles Dates,
 * but Decimal serializes to `{}` unless we coerce. This walks a value and turns
 * Decimal-like objects into numbers so API responses are plain JSON.
 */
function isDecimal(v) {
  return (
    v != null &&
    typeof v === 'object' &&
    typeof v.toFixed === 'function' &&
    typeof v.toNumber === 'function'
  );
}

export function serialize(value) {
  if (value == null) return value;
  if (isDecimal(value)) return value.toNumber();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
}

/** Drop sensitive fields from a user record before it leaves the API. */
export function publicUser(user) {
  if (!user) return user;
  const { passwordHash: _pw, refreshTokens: _rt, passwordResets: _pr, ...safe } = user;
  return serialize(safe);
}

export default { serialize, publicUser };
