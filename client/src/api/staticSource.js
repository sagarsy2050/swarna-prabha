/**
 * Read-only catalogue served from a JSON file baked into the static build
 * (GitHub Pages has no API). Mirrors the server's product / category / shop
 * list + filter + facet + get logic so the storefront behaves the same.
 *
 * Enabled when `import.meta.env.VITE_STATIC === 'true'`.
 */

let cache = null;

async function load() {
  if (cache) return cache;
  const url = `${import.meta.env.BASE_URL}data/catalog.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`static catalogue not found (${res.status})`);
  cache = await res.json();
  return cache;
}

const ci = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
const has = (a, b) => String(a || '').toLowerCase().includes(String(b || '').toLowerCase());

function paginate(rows, query) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

function applyFilters(products, categories, query) {
  let rows = products.filter((p) => p.isPublished !== false);

  if (query.category) {
    const cat = categories.find(
      (c) => c.slug === query.category || c.id === query.category || c.code === query.category,
    );
    if (!cat) return [];
    rows = rows.filter((p) => p.categoryId === cat.id);
  }
  if (query.shop) {
    rows = rows.filter((p) => p.shop && (p.shop.slug === query.shop || p.shop.jewellerId === query.shop));
  }
  if (query.metal) rows = rows.filter((p) => ci(p.metal, query.metal));
  if (query.purity) rows = rows.filter((p) => ci(p.purity, query.purity));
  if (query.stone) rows = rows.filter((p) => has(p.stone, query.stone));
  if (query.availability) rows = rows.filter((p) => p.availability === query.availability);
  if (query.priceMin != null && query.priceMin !== '') rows = rows.filter((p) => Number(p.price) >= Number(query.priceMin));
  if (query.priceMax != null && query.priceMax !== '') rows = rows.filter((p) => Number(p.price) <= Number(query.priceMax));
  if (query.weightMin != null && query.weightMin !== '') rows = rows.filter((p) => p.weightGrams != null && Number(p.weightGrams) >= Number(query.weightMin));
  if (query.weightMax != null && query.weightMax !== '') rows = rows.filter((p) => p.weightGrams != null && Number(p.weightGrams) <= Number(query.weightMax));
  if (query.q) {
    const q = query.q;
    rows = rows.filter(
      (p) => has(p.name, q) || has(p.description, q) || has(p.metal, q) || has(p.stone, q),
    );
  }

  const raw = String(query.sort || '-createdAt');
  const desc = raw.startsWith('-');
  const field = { name: 'name', price: 'price', createdAt: 'createdAt', weightGrams: 'weightGrams' }[
    desc ? raw.slice(1) : raw
  ] || 'createdAt';
  rows = [...rows].sort((a, b) => {
    const av = a[field] ?? '';
    const bv = b[field] ?? '';
    const cmp = typeof av === 'number' || !Number.isNaN(Number(av))
      ? Number(av) - Number(bv)
      : String(av).localeCompare(String(bv));
    return desc ? -cmp : cmp;
  });
  return rows;
}

export const staticCatalog = {
  async categories() {
    const { categories } = await load();
    return { data: categories };
  },
  async category(key) {
    const { categories } = await load();
    const c = categories.find((x) => x.slug === key || x.id === key || x.code === key);
    if (!c) throw new Error('category not found');
    return { data: c };
  },
  async list(query = {}) {
    const { products, categories } = await load();
    return paginate(applyFilters(products, categories, query), query);
  },
  async facets(query = {}) {
    const { products, categories } = await load();
    const rows = applyFilters(products, categories, { category: query?.category });
    const uniq = (k) => [...new Set(rows.map((p) => p[k]).filter(Boolean))].sort();
    const nums = (k) => rows.map((p) => Number(p[k])).filter((n) => !Number.isNaN(n));
    const prices = nums('price');
    const weights = nums('weightGrams');
    return {
      data: {
        metal: uniq('metal'),
        purity: uniq('purity'),
        stone: uniq('stone'),
        priceMin: prices.length ? Math.min(...prices) : 0,
        priceMax: prices.length ? Math.max(...prices) : 0,
        weightMin: weights.length ? Math.min(...weights) : 0,
        weightMax: weights.length ? Math.max(...weights) : 0,
      },
    };
  },
  async get(id) {
    const { products } = await load();
    const p = products.find((x) => x.id === id);
    if (!p) throw new Error('product not found');
    return { data: p };
  },
};

export const staticShops = {
  async list() {
    const { shops } = await load();
    return { data: shops.map(({ products: _p, ...rest }) => rest) };
  },
  async get(slug) {
    const { shops } = await load();
    const s = shops.find((x) => x.slug === slug);
    if (!s) throw new Error('shop not found');
    return { data: s };
  },
};
