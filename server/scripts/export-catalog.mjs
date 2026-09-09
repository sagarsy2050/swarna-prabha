// Export the whole read-only catalogue (categories, products, shops) to one
// JSON file the static GitHub Pages build serves instead of calling the API.
//
// Run against a seeded API:  node server/scripts/export-catalog.mjs
// Output: client/public/data/catalog.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.EXPORT_API_URL || 'http://localhost:4000';
const OUT = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  '..',
  'client',
  'public',
  'data',
  'catalog.json',
);

async function get(p) {
  const r = await fetch(API + p);
  if (!r.ok) throw new Error(`${p} -> HTTP ${r.status}`);
  return r.json();
}

async function allProducts() {
  const out = [];
  let page = 1;
  for (;;) {
    const { data, meta } = await get(`/api/products?all=0&pageSize=100&page=${page}`);
    out.push(...data);
    if (page >= (meta?.totalPages || 1)) break;
    page += 1;
  }
  return out;
}

async function main() {
  const [{ data: categories }, products] = await Promise.all([get('/api/categories'), allProducts()]);
  const { data: shopsList } = await get('/api/shops');
  const shops = await Promise.all(
    shopsList.map(async (s) => {
      try {
        return (await get(`/api/shops/${s.slug}`)).data;
      } catch {
        return { ...s, products: [] };
      }
    }),
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    currency: products[0]?.currency || 'INR',
    categories,
    products,
    shops,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload));
  console.log(
    `wrote ${OUT}\n  ${categories.length} categories, ${products.length} products, ${shops.length} shops` +
      `  (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
