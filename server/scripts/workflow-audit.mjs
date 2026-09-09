// Full workflow audit against the running API. Prints PASS/FAIL per check.
//
// Credentials come from the same env vars the seed uses — no passwords are
// stored in this file. Run after `npm run db:seed`:
//   SEED_ADMIN_PASSWORD=… SEED_JEWELLER_PASSWORD=… SEED_CUSTOMER_PASSWORD=… \
//     node server/scripts/workflow-audit.mjs
// (dotenv is loaded so server/.env is picked up automatically.)
import 'dotenv/config';

const API = process.env.AUDIT_API_URL || 'http://localhost:4000';
const PW = {
  admin: process.env.SEED_ADMIN_PASSWORD,
  jeweller: process.env.SEED_JEWELLER_PASSWORD,
  customer: process.env.SEED_CUSTOMER_PASSWORD,
};
if (!PW.admin || !PW.jeweller || !PW.customer) {
  console.error('Set SEED_ADMIN_PASSWORD / SEED_JEWELLER_PASSWORD / SEED_CUSTOMER_PASSWORD (see server/.env).');
  process.exit(1);
}
let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
}
async function j(method, path, body, token) {
  const r = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let d; const t = await r.text();
  try { d = JSON.parse(t); } catch { d = t; }
  return { s: r.status, d };
}
const tok = async (email, pw) => (await j('POST', '/api/auth/login', { email, password: pw })).d?.data?.accessToken;

async function main() {
  // ---------- AUTH ----------
  const qaEmail = `qa_${Date.now()}@t.local`;
  const qaPw = `qa-${Math.random().toString(36).slice(2)}`;
  const reg = await j('POST', '/api/auth/register', { email: qaEmail, password: qaPw, fullName: 'QA User' });
  check('AUTH register customer', reg.s === 201 && reg.d.data.user.role === 'CUSTOMER');
  const badLogin = await j('POST', '/api/auth/login', { email: 'admin@swarnaprabha.local', password: 'definitely-not-the-password' });
  check('AUTH wrong password -> 401', badLogin.s === 401);
  const admin = await tok('admin@swarnaprabha.local', PW.admin);
  const jew = await tok('jeweller@swarnaprabha.local', PW.jeweller);
  const jew2 = await tok('jeweller2@swarnaprabha.local', PW.jeweller);
  const cust = await tok('customer@swarnaprabha.local', PW.customer);
  check('AUTH admin/jeweller/customer login', admin && jew && cust);
  const me = await j('GET', '/api/auth/me', null, cust);
  check('AUTH /me with token', me.s === 200 && me.d.data.email === 'customer@swarnaprabha.local');
  check('AUTH /me without token -> 401', (await j('GET', '/api/auth/me')).s === 401);

  // ---------- HEALTH ----------
  const h = await j('GET', '/api/health?deep=1');
  check('HEALTH deep ok, no AI keys', h.s === 200 && h.d.status === 'ok' && !('ai' in h.d.checks) && 'database' in h.d.checks);

  // ---------- CATALOGUE ----------
  const cats = await j('GET', '/api/categories');
  check('CAT categories list (6, with counts)', cats.s === 200 && cats.d.data.length === 6 && cats.d.data.every(c => 'productCount' in c));
  const ringCat = cats.d.data.find(c => c.slug === 'rings');
  const prodAll = await j('GET', '/api/products?pageSize=1');
  check('CAT products total = 96', prodAll.d.meta.total === 96);
  const ringList = await j('GET', '/api/products?category=rings&pageSize=100');
  check('CAT ?category=rings -> 24', ringList.d.meta.total === 24);
  const leak = ringList.d.data.flatMap(p => p.imageUrls).some(i => !i.url.startsWith('/jewellery-images/rings/'));
  check('CLASSIFICATION no cross-folder image leak (rings)', !leak);
  const empty = await j('GET', '/api/products?category=bangles');
  check('CAT empty category -> 0 (empty-state)', empty.d.meta.total === 0);
  const filt = await j('GET', '/api/products?metal=Platinum&priceMin=20000&pageSize=100');
  check('CAT filter metal+price', filt.d.data.length > 0 && filt.d.data.every(p => p.metal === 'Platinum' && Number(p.price) >= 20000));
  const facets = await j('GET', '/api/products/facets?category=rings');
  check('CAT facets return distinct values', facets.s === 200 && Array.isArray(facets.d.data.metal) && facets.d.data.priceMax > 0);
  const one = await j('GET', `/api/products/${prodAll.d.data[0].id}`);
  check('CAT product detail full', one.s === 200 && one.d.data.imageUrls && one.d.data.category && 'shop' in one.d.data);
  check('CAT unknown product -> 404', (await j('GET', '/api/products/nope')).s === 404);

  // ---------- CLASSIFICATION INTEGRITY (write) ----------
  const badImg = await j('POST', '/api/products', { name: 'QA bad', categoryId: ringCat.id, price: 100, images: [{ path: 'earring-001.jpg' }] }, jew);
  check('CLASSIFICATION cross-folder image on create -> 422', badImg.s === 422 && badImg.d.error.code === 'IMAGE_CATEGORY_MISMATCH');
  const goodImg = await j('POST', '/api/products', { name: 'QA good ' + Date.now(), categoryId: ringCat.id, price: 100, metal: 'Gold', stock: 5, images: [{ path: 'ring-001.jpg' }] }, jew);
  check('CLASSIFICATION valid product create -> 201', goodImg.s === 201);
  const qaProdId = goodImg.d?.data?.id;
  if (qaProdId) {
    const upd = await j('PATCH', `/api/products/${qaProdId}`, { price: 150 }, jew);
    check('PRODUCT jeweller edits own', upd.s === 200 && Number(upd.d.data.price) === 150);
    const otherEdit = await j('PATCH', `/api/products/${qaProdId}`, { price: 1 }, jew2);
    check('RBAC jeweller cannot edit another jeweller product -> 403', otherEdit.s === 403);
  }

  // ---------- SHOPS ----------
  const shops = await j('GET', '/api/shops');
  check('SHOP discovery list (2, with productCount)', shops.s === 200 && shops.d.data.length === 2 && shops.d.data.every(s => 'productCount' in s));
  const shop = await j('GET', `/api/shops/${shops.d.data[0].slug}`);
  check('SHOP detail (products + hours)', shop.s === 200 && Array.isArray(shop.d.data.products) && shop.d.data.openingHours);
  const shopMine = await j('GET', '/api/shops/me', null, jew);
  check('SHOP /me for jeweller', shopMine.s === 200 && shopMine.d.data.shopName);
  const shopMineCust = await j('GET', '/api/shops/me', null, cust);
  check('RBAC customer cannot GET /api/shops/me -> 403', shopMineCust.s === 403);
  const shopUpd = await j('PATCH', '/api/shops/me', { phone: '+91 99999 00000' }, jew);
  check('SHOP jeweller updates own profile', shopUpd.s === 200 && shopUpd.d.data.phone === '+91 99999 00000');
  const shopAdminAll = await j('GET', '/api/shops?all=1', null, admin);
  check('SHOP admin ?all=1', shopAdminAll.s === 200 && shopAdminAll.d.data.length >= 2);

  // ---------- CART + CHECKOUT ----------
  await j('DELETE', '/api/cart', null, cust);
  const inStock = (await j('GET', '/api/products?availability=IN_STOCK&pageSize=50')).d.data.filter(p => p.stock >= 3);
  const [a, b] = inStock; // may be same jeweller or different
  await j('POST', '/api/cart/items', { productId: a.id, quantity: 2 }, cust);
  const cart2 = await j('POST', '/api/cart/items', { productId: b.id, quantity: 1 }, cust);
  check('CART add items', cart2.s === 201 && cart2.d.data.itemCount === 3);
  const qty = await j('PATCH', `/api/cart/items/${a.id}`, { quantity: 3 }, cust);
  check('CART update quantity', qty.d.data.items.find(i => i.productId === a.id).quantity === 3);
  const rem = await j('PATCH', `/api/cart/items/${b.id}`, { quantity: 0 }, cust);
  check('CART remove item (qty 0)', !rem.d.data.items.find(i => i.productId === b.id));
  const stockBefore = (await j('GET', `/api/products/${a.id}`)).d.data.stock;
  const co = await j('POST', '/api/orders', { contactName: 'QA', contactPhone: '+91 90000 00000', shippingAddress: { line1: 'x', city: 'Chennai', postalCode: '600001', country: 'India' } }, cust);
  check('CHECKOUT creates order(s)', co.s === 201 && Array.isArray(co.d.data) && co.d.data.length >= 1);
  const order = co.d.data[0];
  check('CHECKOUT pending Payment row', order.payment?.status === 'PENDING');
  const stockAfter = (await j('GET', `/api/products/${a.id}`)).d.data.stock;
  check('CHECKOUT stock decremented', stockBefore - stockAfter === 3, `${stockBefore} -> ${stockAfter}`);
  const cartCleared = await j('GET', '/api/cart', null, cust);
  check('CHECKOUT cart cleared', cartCleared.d.data.itemCount === 0);

  // ---------- ORDER STATUS ----------
  const jewForOrder = order.shop.slug === 'amara-fine-jewellery' ? jew : jew2;
  const st1 = await j('PATCH', `/api/orders/${order.id}/status`, { status: 'CONFIRMED' }, jewForOrder);
  check('ORDER jeweller CONFIRM (payment -> PAID)', st1.s === 200 && st1.d.data.status === 'CONFIRMED' && st1.d.data.payment.status === 'PAID');
  const stBad = await j('PATCH', `/api/orders/${order.id}/status`, { status: 'DELIVERED' }, jewForOrder);
  check('ORDER illegal transition -> 409', stBad.s === 409);
  const stCust = await j('PATCH', `/api/orders/${order.id}/status`, { status: 'SHIPPED' }, cust);
  check('RBAC customer cannot set order status -> 403', stCust.s === 403);
  const stCancel = await j('PATCH', `/api/orders/${order.id}/status`, { status: 'CANCELLED' }, jewForOrder);
  const stockRestored = (await j('GET', `/api/products/${a.id}`)).d.data.stock;
  check('ORDER cancel restocks', stCancel.s === 200 && stockRestored === stockBefore, `${stockAfter} -> ${stockRestored}`);
  check('ORDER customer sees own orders', (await j('GET', '/api/orders', null, cust)).d.meta.total >= 1);
  check('ORDER jeweller sees shop orders', (await j('GET', '/api/orders', null, jewForOrder)).d.meta.total >= 1);

  // ---------- APPOINTMENTS ----------
  const jshop = await j('GET', '/api/shops/me', null, jew);
  const jid = jshop.d.data.jewellerId;
  let day = new Date(); day.setUTCDate(day.getUTCDate() + 4);
  while ([0, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
  const date = day.toISOString().slice(0, 10);
  const avail = await j('GET', `/api/appointments/availability?jewellerId=${jid}&date=${date}`);
  check('APPT availability returns slots', avail.s === 200 && Array.isArray(avail.d.data.available) && avail.d.data.available.length > 0);
  const slot = avail.d.data.available[0];
  const bk = await j('POST', '/api/appointments', { jewellerId: jid, date, timeSlot: slot, serviceType: 'VIEWING', customerName: 'QA', customerPhone: '+91 90000 11111' }, cust);
  check('APPT book -> PENDING', bk.s === 201 && bk.d.data.status === 'PENDING');
  const apptId = bk.d.data.id;
  const dbl = await j('POST', '/api/appointments', { jewellerId: jid, date, timeSlot: slot, customerName: 'QA2', customerPhone: '+91 90000 22222' }, cust);
  check('APPT double-book same slot -> 409', dbl.s === 409 && dbl.d.error.code === 'SLOT_TAKEN');
  const past = await j('POST', '/api/appointments', { jewellerId: jid, date: '2020-01-01', timeSlot: slot, customerName: 'x', customerPhone: '+91 90000 33333' }, cust);
  check('APPT past date rejected', past.s === 422 || past.s === 400);
  const custConfirm = await j('PATCH', `/api/appointments/${apptId}`, { status: 'CONFIRMED' }, cust);
  check('APPT customer cannot confirm -> 403', custConfirm.s === 403);
  const jewConfirm = await j('PATCH', `/api/appointments/${apptId}`, { status: 'CONFIRMED' }, jew);
  check('APPT jeweller confirms', jewConfirm.s === 200 && jewConfirm.d.data.status === 'CONFIRMED');
  const custCancel = await j('PATCH', `/api/appointments/${apptId}`, { status: 'CANCELLED' }, cust);
  check('APPT customer cancels own', custCancel.s === 200 && custCancel.d.data.status === 'CANCELLED');
  const slotFreed = await j('GET', `/api/appointments/availability?jewellerId=${jid}&date=${date}`);
  check('APPT cancelled slot freed', slotFreed.d.data.available.includes(slot));

  // ---------- RBAC (extra) ----------
  check('RBAC customer -> POST /api/products -> 403', (await j('POST', '/api/products', { name: 'x', categoryId: ringCat.id, price: 1 }, cust)).s === 403);
  check('RBAC customer -> GET /api/users -> 403', (await j('GET', '/api/users', null, cust)).s === 403);
  check('RBAC jeweller -> GET /api/users -> 403', (await j('GET', '/api/users', null, jew)).s === 403);
  check('RBAC customer -> POST /api/categories -> 403', (await j('POST', '/api/categories', { code: 'X', name: 'x', slug: 'x', folder: 'x' }, cust)).s === 403);
  check('RBAC jeweller -> POST /api/categories -> 403 (admin only)', (await j('POST', '/api/categories', { code: 'X', name: 'x', slug: 'x', folder: 'x' }, jew)).s === 403);
  check('RBAC admin lists users', (await j('GET', '/api/users', null, admin)).d.meta.total >= 4);

  // ---------- ADMIN DASH DATA ----------
  check('ADMIN shops all', (await j('GET', '/api/shops?all=1', null, admin)).d.data.length === 2);
  check('ADMIN categories all', (await j('GET', '/api/categories?all=1', null, admin)).d.data.length === 6);
  check('ADMIN products all', (await j('GET', '/api/products?all=1&pageSize=1', null, admin)).d.meta.total >= 96);
  check('ADMIN orders all', (await j('GET', '/api/orders?pageSize=1', null, admin)).s === 200);
  check('ADMIN appointments all', (await j('GET', '/api/appointments?pageSize=1', null, admin)).s === 200);

  // ---------- cleanup ----------
  if (qaProdId) await j('DELETE', `/api/products/${qaProdId}`, null, jew);
  await j('PATCH', '/api/shops/me', { phone: '+91 80 2222 1010' }, jew);

  console.log(results.join('\n'));
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}
main().catch((e) => { console.error('AUDIT CRASHED:', e); process.exit(2); });
