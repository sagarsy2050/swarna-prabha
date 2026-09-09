// Thin aliases over the auth middleware, matching the workflow spec's naming.
import { requireRole } from './auth.js';

export const roleGuard = requireRole;
export const jewellerOnly = requireRole('JEWELLER', 'ADMIN');
export const adminOnly = requireRole('ADMIN');

export default roleGuard;
