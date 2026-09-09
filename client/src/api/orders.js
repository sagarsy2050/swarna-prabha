import { http } from './http.js';

export const cartApi = {
  get: () => http.get('/api/cart'),
  addItem: (productId, quantity = 1) => http.post('/api/cart/items', { productId, quantity }),
  setQuantity: (productId, quantity) => http.patch(`/api/cart/items/${productId}`, { quantity }),
  clear: () => http.del('/api/cart'),
};

export const ordersApi = {
  checkout: (body) => http.post('/api/orders', body),
  list: (query) => http.get('/api/orders', query),
  get: (id) => http.get(`/api/orders/${id}`),
  setStatus: (id, status) => http.patch(`/api/orders/${id}/status`, { status }),
};

export default { cartApi, ordersApi };
