import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { PageLoader } from '@/components/Loading';
import StatusBadge from '@/components/StatusBadge';
import { DashboardShell, Table, StatCard } from '@/components/dashboard/Shell';
import { assetUrl, formatMoney, formatDate } from '@/lib/utils';

const TABS = ['Overview', 'Products', 'Inventory', 'Appointments', 'Orders', 'Shop profile'];
const ORDER_NEXT = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

function err(e) {
  alert(e?.message || 'Something went wrong');
}

// ── Products tab ────────────────────────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // product or {} for new
  const [folderImages, setFolderImages] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.catalog.list({ mine: 'true', all: '1', pageSize: 100 }), api.catalog.categories({ all: '1' })])
      .then(([p, c]) => {
        setProducts(p.data || []);
        setCats(c.data || []);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const openEditor = async (p) => {
    setEditing(p);
    const catId = p?.categoryId || cats[0]?.id;
    if (catId) {
      try {
        const r = await api.catalog.categoryImages(catId);
        setFolderImages(r.data.images || []);
      } catch {
        setFolderImages([]);
      }
    }
  };

  const save = async (form) => {
    try {
      if (editing.id) await api.catalog.update(editing.id, form);
      else await api.catalog.create(form);
      setEditing(null);
      load();
    } catch (e) {
      err(e);
    }
  };
  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.catalog.remove(id);
      load();
    } catch (e) {
      err(e);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-neutral-500">{products.length} products</p>
        <button
          onClick={() => openEditor({})}
          className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm"
        >
          Add product
        </button>
      </div>

      <Table
        empty="No products yet — add your first piece."
        columns={[
          {
            key: 'name',
            label: 'Product',
            render: (p) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                  {p.primaryImage && <img src={assetUrl(p.primaryImage.url)} alt="" className="w-full h-full object-cover" />}
                </div>
                <div>
                  <p className="text-neutral-900">{p.name}</p>
                  <p className="text-xs text-neutral-400">{p.category?.name}</p>
                </div>
              </div>
            ),
          },
          { key: 'price', label: 'Price', render: (p) => formatMoney(p.price, p.currency) },
          { key: 'stock', label: 'Stock', render: (p) => p.stock },
          { key: 'availability', label: 'Availability', render: (p) => <StatusBadge status={p.availability} /> },
          { key: 'isPublished', label: 'Live', render: (p) => (p.isPublished ? 'Yes' : 'Draft') },
          {
            key: 'act',
            label: '',
            render: (p) => (
              <div className="flex gap-3 text-sm">
                <button onClick={() => openEditor(p)} className="text-gold-700">Edit</button>
                <button onClick={() => remove(p.id)} className="text-neutral-400 hover:text-destructive">Delete</button>
              </div>
            ),
          },
        ]}
        rows={products}
      />

      {editing && (
        <ProductEditor
          product={editing}
          categories={cats}
          folderImages={folderImages}
          onCategoryChange={async (catId) => {
            try {
              const r = await api.catalog.categoryImages(catId);
              setFolderImages(r.data.images || []);
            } catch {
              setFolderImages([]);
            }
          }}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ProductEditor({ product, categories, folderImages, onCategoryChange, onCancel, onSave }) {
  const isNew = !product.id;
  const [f, setF] = useState({
    name: product.name || '',
    categoryId: product.categoryId || categories[0]?.id || '',
    price: product.price ?? '',
    stock: product.stock ?? 0,
    metal: product.metal || '',
    purity: product.purity || '',
    weightGrams: product.weightGrams ?? '',
    stone: product.stone || '',
    description: product.description || '',
    availability: product.availability || 'IN_STOCK',
    isPublished: product.isPublished ?? true,
    images: (product.imageUrls || []).map((i) => i.path),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const toggleImg = (path) =>
    setF((s) => ({
      ...s,
      images: s.images.includes(path) ? s.images.filter((p) => p !== path) : [...s.images, path].slice(0, 6),
    }));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 p-6">
        <h3 className="font-display text-2xl text-neutral-900 mb-4">{isNew ? 'Add product' : 'Edit product'}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <L label="Name"><input value={f.name} onChange={set('name')} className={inp} /></L>
          <L label="Category">
            <select
              value={f.categoryId}
              onChange={(e) => {
                set('categoryId')(e);
                setF((s) => ({ ...s, images: [] }));
                onCategoryChange(e.target.value);
              }}
              className={inp}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </L>
          <L label="Price (₹)"><input type="number" value={f.price} onChange={set('price')} className={inp} /></L>
          <L label="Stock"><input type="number" value={f.stock} onChange={set('stock')} className={inp} /></L>
          <L label="Metal"><input value={f.metal} onChange={set('metal')} className={inp} /></L>
          <L label="Purity"><input value={f.purity} onChange={set('purity')} className={inp} /></L>
          <L label="Weight (g)"><input type="number" step="0.1" value={f.weightGrams} onChange={set('weightGrams')} className={inp} /></L>
          <L label="Stone"><input value={f.stone} onChange={set('stone')} className={inp} /></L>
          <L label="Availability">
            <select value={f.availability} onChange={set('availability')} className={inp}>
              <option value="IN_STOCK">In stock</option>
              <option value="MADE_TO_ORDER">Made to order</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </L>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={f.isPublished} onChange={set('isPublished')} /> Published
          </label>
        </div>
        <L label="Description" className="mt-3">
          <textarea value={f.description} onChange={set('description')} rows={2} className={inp} />
        </L>

        <p className="text-xs uppercase tracking-wide text-neutral-500 mt-4 mb-2">
          Images — from this category&apos;s folder only ({f.images.length} selected)
        </p>
        <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto">
          {folderImages.map((img) => (
            <button
              key={img.path}
              type="button"
              onClick={() => toggleImg(img.path)}
              className={`aspect-square rounded-lg overflow-hidden border-2 ${
                f.images.includes(img.path) ? 'border-neutral-900' : 'border-transparent'
              }`}
            >
              <img src={assetUrl(img.url)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          {folderImages.length === 0 && (
            <p className="col-span-6 text-sm text-neutral-400 py-4">No images in this category&apos;s folder.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-neutral-500">Cancel</button>
          <button
            onClick={() =>
              onSave({
                name: f.name,
                categoryId: f.categoryId,
                price: Number(f.price),
                stock: Number(f.stock),
                metal: f.metal || undefined,
                purity: f.purity || undefined,
                weightGrams: f.weightGrams === '' ? undefined : Number(f.weightGrams),
                stone: f.stone || undefined,
                description: f.description || undefined,
                availability: f.availability,
                isPublished: f.isPublished,
                images: f.images.map((path) => ({ path })),
              })
            }
            className="rounded-full bg-neutral-900 text-white px-5 py-2 text-sm"
          >
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm';
function L({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

// ── Inventory tab ──────────────────────────────────────────────────────────
function InventoryTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    api.inventory.list({ pageSize: 100 }).then((r) => setRows(r.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const adjust = async (row, delta) => {
    try {
      await api.inventory.update(row.id, { quantity: Math.max(0, row.quantity + delta) });
      load();
    } catch (e) {
      err(e);
    }
  };
  if (loading) return <PageLoader />;
  return (
    <Table
      empty="No inventory items."
      rows={rows}
      columns={[
        { key: 'sku', label: 'SKU' },
        { key: 'name', label: 'Item' },
        { key: 'material', label: 'Material' },
        {
          key: 'quantity',
          label: 'Qty',
          render: (r) => (
            <span className="inline-flex items-center gap-2">
              <button onClick={() => adjust(r, -1)} className="text-neutral-400">−</button>
              <span className={r.quantity <= r.reorderLevel ? 'text-destructive font-medium' : ''}>{r.quantity}</span>
              <button onClick={() => adjust(r, 1)} className="text-neutral-400">+</button>
            </span>
          ),
        },
        { key: 'reorderLevel', label: 'Reorder at' },
      ]}
    />
  );
}

// ── Appointments tab ──────────────────────────────────────────────────────
function AppointmentsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    api.appointments.list({ sort: '-date', pageSize: 100 }).then((r) => setRows(r.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const setStatus = async (id, status) => {
    try {
      await api.appointments.update(id, { status });
      load();
    } catch (e) {
      err(e);
    }
  };
  if (loading) return <PageLoader />;
  return (
    <Table
      empty="No appointment requests."
      rows={rows}
      columns={[
        { key: 'date', label: 'When', render: (a) => `${formatDate(a.date)} · ${a.timeSlot}` },
        { key: 'customerName', label: 'Customer', render: (a) => `${a.customerName} · ${a.customerPhone}` },
        { key: 'serviceType', label: 'Service', render: (a) => a.serviceType[0] + a.serviceType.slice(1).toLowerCase() },
        { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
        {
          key: 'act',
          label: '',
          render: (a) => (
            <div className="flex gap-2 text-sm">
              {a.status === 'PENDING' && (
                <>
                  <button onClick={() => setStatus(a.id, 'CONFIRMED')} className="text-emerald-700">Accept</button>
                  <button onClick={() => setStatus(a.id, 'REJECTED')} className="text-destructive">Reject</button>
                </>
              )}
              {a.status === 'CONFIRMED' && (
                <button onClick={() => setStatus(a.id, 'COMPLETED')} className="text-gold-700">Mark done</button>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

// ── Orders tab ────────────────────────────────────────────────────────────
function OrdersTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    api.orders.list({ sort: '-placedAt', pageSize: 100 }).then((r) => setRows(r.data || [])).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const move = async (id, status) => {
    try {
      await api.orders.setStatus(id, status);
      load();
    } catch (e) {
      err(e);
    }
  };
  if (loading) return <PageLoader />;
  return (
    <Table
      empty="No orders yet."
      rows={rows}
      columns={[
        { key: 'id', label: 'Order', render: (o) => o.id.slice(-8).toUpperCase() },
        { key: 'placedAt', label: 'Placed', render: (o) => formatDate(o.placedAt) },
        { key: 'customer', label: 'Customer', render: (o) => o.customer?.fullName || o.contactName },
        { key: 'total', label: 'Total', render: (o) => formatMoney(o.total, o.currency) },
        { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
        {
          key: 'act',
          label: 'Advance',
          render: (o) => (
            <div className="flex gap-2 text-sm">
              {(ORDER_NEXT[o.status] || []).map((s) => (
                <button
                  key={s}
                  onClick={() => move(o.id, s)}
                  className={s === 'CANCELLED' ? 'text-destructive' : 'text-gold-700'}
                >
                  {s[0] + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}

// ── Shop profile tab ──────────────────────────────────────────────────────
function ShopProfileTab() {
  const [shop, setShop] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.shops.mine().then((r) => setShop(r.data)).catch(() => setShop(false));
  }, []);
  if (shop === null) return <PageLoader />;
  if (shop === false) return <p className="text-neutral-500">No shop profile found.</p>;
  const set = (k) => (e) => setShop((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    try {
      const { data } = await api.shops.updateMine({
        shopName: shop.shopName,
        description: shop.description || undefined,
        addressLine1: shop.addressLine1 || undefined,
        city: shop.city || undefined,
        region: shop.region || undefined,
        postalCode: shop.postalCode || undefined,
        country: shop.country || undefined,
        phone: shop.phone || undefined,
        email: shop.email || '',
      });
      setShop(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      err(e);
    }
  };
  return (
    <div className="max-w-xl bg-white border border-neutral-200 rounded-2xl p-6 grid sm:grid-cols-2 gap-3">
      <L label="Shop name"><input value={shop.shopName || ''} onChange={set('shopName')} className={inp} /></L>
      <L label="Phone"><input value={shop.phone || ''} onChange={set('phone')} className={inp} /></L>
      <L label="Email" className="sm:col-span-2"><input value={shop.email || ''} onChange={set('email')} className={inp} /></L>
      <L label="Description" className="sm:col-span-2"><textarea value={shop.description || ''} onChange={set('description')} rows={2} className={inp} /></L>
      <L label="Address"><input value={shop.addressLine1 || ''} onChange={set('addressLine1')} className={inp} /></L>
      <L label="City"><input value={shop.city || ''} onChange={set('city')} className={inp} /></L>
      <L label="Region"><input value={shop.region || ''} onChange={set('region')} className={inp} /></L>
      <L label="Postal code"><input value={shop.postalCode || ''} onChange={set('postalCode')} className={inp} /></L>
      <L label="Country"><input value={shop.country || ''} onChange={set('country')} className={inp} /></L>
      <div className="sm:col-span-2 flex items-center gap-3 mt-2">
        <button onClick={save} className="rounded-full bg-neutral-900 text-white px-5 py-2 text-sm">Save</button>
        {saved && <span className="text-sm text-emerald-700">Saved</span>}
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────
function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => {
    Promise.all([
      api.catalog.list({ mine: 'true', all: '1', pageSize: 1 }),
      api.orders.list({ pageSize: 100 }),
      api.appointments.list({ pageSize: 100 }),
    ]).then(([p, o, a]) => {
      const orders = o.data || [];
      setS({
        products: p.meta.total,
        openOrders: orders.filter((x) => !['DELIVERED', 'CANCELLED'].includes(x.status)).length,
        revenue: orders.filter((x) => x.status !== 'CANCELLED').reduce((t, x) => t + Number(x.total), 0),
        pendingAppts: (a.data || []).filter((x) => x.status === 'PENDING').length,
      });
    });
  }, []);
  if (!s) return <PageLoader />;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Products" value={s.products} />
      <StatCard label="Open orders" value={s.openOrders} />
      <StatCard label="Revenue" value={formatMoney(s.revenue)} />
      <StatCard label="Appointment requests" value={s.pendingAppts} />
    </div>
  );
}

export default function JewellerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Overview');
  return (
    <DashboardShell
      title="Jeweller dashboard"
      subtitle={user?.fullName || user?.email}
      tabs={TABS}
      active={tab}
      onTab={setTab}
    >
      {tab === 'Overview' && <Overview />}
      {tab === 'Products' && <ProductsTab />}
      {tab === 'Inventory' && <InventoryTab />}
      {tab === 'Appointments' && <AppointmentsTab />}
      {tab === 'Orders' && <OrdersTab />}
      {tab === 'Shop profile' && <ShopProfileTab />}
    </DashboardShell>
  );
}
