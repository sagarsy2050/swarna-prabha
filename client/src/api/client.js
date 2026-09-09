/**
 * Aggregated API surface. Components import `{ api }` and never touch fetch/URLs.
 * Resources are split into per-domain modules under `src/api/`.
 *
 * Rebuild status: catalogue + appointments are wired to live endpoints. Cart /
 * checkout / orders / shops arrive in Phase 3; until then `api.<that>` returns
 * the interim guard so a half-built page shows an error state, never a crash.
 */
import { http } from './http.js';
import { productsApi } from './products.js';
import { appointmentsApi } from './appointments.js';
import { shopsApi } from './shops.js';
import { cartApi, ordersApi } from './orders.js';

const crud = (base) => ({
  list: (query) => http.get(base, query),
  get: (id) => http.get(`${base}/${id}`),
  create: (body) => http.post(base, body),
  update: (id, body) => http.patch(`${base}/${id}`, body),
  remove: (id) => http.del(`${base}/${id}`),
});

const wired = {
  auth: {
    register: (body) => http.post('/api/auth/register', body),
    login: (body) => http.post('/api/auth/login', body),
    logout: () => http.post('/api/auth/logout'),
    refresh: () => http.refresh(),
    me: () => http.get('/api/auth/me'),
    updateProfile: (body) => http.patch('/api/auth/me', body),
    changePassword: (body) => http.post('/api/auth/change-password', body),
    forgotPassword: (email) => http.post('/api/auth/forgot-password', { email }),
    resetPassword: (body) => http.post('/api/auth/reset-password', body),
  },

  users: {
    ...crud('/api/users'),
    setRole: (id, role) => http.patch(`/api/users/${id}/role`, { role }),
    setActive: (id, isActive) => http.patch(`/api/users/${id}/active`, { isActive }),
  },

  catalog: productsApi,
  products: productsApi,
  shops: shopsApi,
  cart: cartApi,
  orders: ordersApi,
  appointments: appointmentsApi,
  inventory: crud('/api/inventory'),

  files: {
    upload: (file, purpose) => {
      const fd = new FormData();
      fd.append('file', file);
      if (purpose) fd.append('purpose', purpose);
      return http.postForm('/api/files', fd);
    },
    remove: (id) => http.del(`/api/files/${id}`),
  },

  health: (deep) => http.get('/api/health', deep ? { deep: 1 } : undefined),
};

const notYetRebuilt = (name) =>
  new Proxy(
    {},
    {
      get: () => () =>
        Promise.reject(new Error(`"${name}" is being rebuilt — not available yet`)),
    },
  );

export const api = new Proxy(wired, {
  get: (target, prop) =>
    typeof prop === 'string' && !(prop in target) ? notYetRebuilt(prop) : target[prop],
});

export default api;
