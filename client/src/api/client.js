/**
 * Aggregated API surface. Components import `{ api }` and never touch fetch/URLs.
 *
 * Two modes:
 *  - normal: talks to the Express API (dev proxy or VITE_API_URL).
 *  - static (VITE_STATIC=true): read-only catalogue is served from a JSON file
 *    baked into the build (GitHub Pages has no backend); anything that writes
 *    (auth, cart, checkout, appointments, dashboards) rejects with a clear
 *    "demo" message.
 */
import { http } from './http.js';
import { productsApi } from './products.js';
import { appointmentsApi } from './appointments.js';
import { shopsApi } from './shops.js';
import { cartApi, ordersApi } from './orders.js';
import { staticCatalog, staticShops } from './staticSource.js';

export const IS_STATIC = import.meta.env.VITE_STATIC === 'true';

const crud = (base) => ({
  list: (query) => http.get(base, query),
  get: (id) => http.get(`${base}/${id}`),
  create: (body) => http.post(base, body),
  update: (id, body) => http.patch(`${base}/${id}`, body),
  remove: (id) => http.del(`${base}/${id}`),
});

const DEMO_MSG =
  'This is a read-only demo. Run the app locally (see the repo README) for accounts, cart, checkout, appointments and the dashboards.';
const demoReject = () => Promise.reject(Object.assign(new Error(DEMO_MSG), { code: 'STATIC_DEMO' }));
const demoResource = () => new Proxy({}, { get: () => demoReject });

// ── live wiring ─────────────────────────────────────────────────────────────
const live = {
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

// ── static wiring ───────────────────────────────────────────────────────────
const staticCatalogResource = {
  categories: (q) => staticCatalog.categories(q),
  category: (k) => staticCatalog.category(k),
  categoryImages: demoReject,
  list: (q) => staticCatalog.list(q),
  facets: (q) => staticCatalog.facets(q),
  get: (id) => staticCatalog.get(id),
  create: demoReject,
  update: demoReject,
  remove: demoReject,
  createCategory: demoReject,
  updateCategory: demoReject,
  removeCategory: demoReject,
};
const staticShopResource = {
  list: (q) => staticShops.list(q),
  get: (slug) => staticShops.get(slug),
  mine: demoReject,
  updateMine: demoReject,
  adminUpdate: demoReject,
};

const wired = IS_STATIC
  ? {
      auth: {
        // let a logged-out bootstrap resolve quietly; everything else rejects
        refresh: () => Promise.reject(new Error('no session')),
        me: () => Promise.reject(new Error('no session')),
        login: demoReject,
        register: demoReject,
        logout: () => Promise.resolve({}),
        updateProfile: demoReject,
        changePassword: demoReject,
        forgotPassword: demoReject,
        resetPassword: demoReject,
      },
      users: demoResource(),
      catalog: staticCatalogResource,
      products: staticCatalogResource,
      shops: staticShopResource,
      cart: demoResource(),
      orders: demoResource(),
      appointments: demoResource(),
      inventory: demoResource(),
      files: demoResource(),
      health: () => Promise.resolve({ status: 'static', checks: {} }),
    }
  : live;

const missing = (name) =>
  new Proxy({}, { get: () => () => Promise.reject(new Error(`"${name}" is not available`)) });

export const api = new Proxy(wired, {
  get: (target, prop) =>
    typeof prop === 'string' && !(prop in target) ? missing(prop) : target[prop],
});

export default api;
