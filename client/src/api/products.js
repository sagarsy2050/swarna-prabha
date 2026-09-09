import { http } from './http.js';

/** Catalogue: categories, products, filters. Public — no auth needed to browse. */
export const productsApi = {
  categories: (params) => http.get('/api/categories', params),
  category: (idOrSlug) => http.get(`/api/categories/${idOrSlug}`),
  categoryImages: (idOrSlug) => http.get(`/api/categories/${idOrSlug}/images`),

  list: (query) => http.get('/api/products', query),
  facets: (query) => http.get('/api/products/facets', query),
  get: (id) => http.get(`/api/products/${id}`),

  // authoring (JEWELLER / ADMIN)
  create: (body) => http.post('/api/products', body),
  update: (id, body) => http.patch(`/api/products/${id}`, body),
  remove: (id) => http.del(`/api/products/${id}`),

  createCategory: (body) => http.post('/api/categories', body),
  updateCategory: (id, body) => http.patch(`/api/categories/${id}`, body),
  removeCategory: (id) => http.del(`/api/categories/${id}`),
};

export default productsApi;
