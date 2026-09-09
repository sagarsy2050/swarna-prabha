import { http } from './http.js';

export const shopsApi = {
  list: (query) => http.get('/api/shops', query),
  get: (slug) => http.get(`/api/shops/${slug}`),
  mine: () => http.get('/api/shops/me'),
  updateMine: (body) => http.patch('/api/shops/me', body),
  adminUpdate: (id, body) => http.patch(`/api/shops/${id}`, body),
};

export default shopsApi;
