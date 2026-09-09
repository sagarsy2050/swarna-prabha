import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { PageLoader } from '@/components/Loading';
import StatusBadge from '@/components/StatusBadge';
import { DashboardShell, Table, StatCard } from '@/components/dashboard/Shell';
import { formatMoney, formatDate } from '@/lib/utils';

const TABS = ['Overview', 'Users', 'Shops', 'Categories', 'Products', 'Orders', 'Appointments'];
const fail = (e) => alert(e?.message || 'Something went wrong');

function useList(fetcher, deps = []) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    fetcher().then((r) => setRows(r.data || [])).catch(fail).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(load, [load]);
  return { rows, loading, load };
}

function UsersTab() {
  const { rows, loading, load } = useList(() => api.users.list({ pageSize: 100 }));
  const [creating, setCreating] = useState(null);
  if (loading) return <PageLoader />;
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setCreating({ email: '', password: '', role: 'JEWELLER', fullName: '' })}
          className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm"
        >
          Add user
        </button>
      </div>
      <Table
        rows={rows}
        columns={[
          { key: 'fullName', label: 'Name', render: (u) => u.fullName || '—' },
          { key: 'email', label: 'Email' },
          {
            key: 'role',
            label: 'Role',
            render: (u) => (
              <select
                value={u.role}
                onChange={async (e) => {
                  try {
                    await api.users.setRole(u.id, e.target.value);
                    load();
                  } catch (err) {
                    fail(err);
                  }
                }}
                className="rounded-lg border border-neutral-200 px-2 py-1 text-sm"
              >
                {['CUSTOMER', 'JEWELLER', 'ADMIN'].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            ),
          },
          {
            key: 'isActive',
            label: 'Active',
            render: (u) => (
              <button
                onClick={async () => {
                  try {
                    await api.users.setActive(u.id, !u.isActive);
                    load();
                  } catch (err) {
                    fail(err);
                  }
                }}
                className={u.isActive ? 'text-emerald-700' : 'text-destructive'}
              >
                {u.isActive ? 'Active' : 'Disabled'}
              </button>
            ),
          },
        ]}
      />
      {creating && (
        <Modal title="Add user" onClose={() => setCreating(null)}>
          {['email', 'password', 'fullName'].map((k) => (
            <input
              key={k}
              placeholder={k}
              type={k === 'password' ? 'password' : 'text'}
              value={creating[k]}
              onChange={(e) => setCreating((c) => ({ ...c, [k]: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm mb-2"
            />
          ))}
          <select
            value={creating.role}
            onChange={(e) => setCreating((c) => ({ ...c, role: e.target.value }))}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm mb-3"
          >
            {['CUSTOMER', 'JEWELLER', 'ADMIN'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={async () => {
              try {
                await api.users.create(creating);
                setCreating(null);
                load();
              } catch (err) {
                fail(err);
              }
            }}
            className="rounded-full bg-neutral-900 text-white px-5 py-2 text-sm"
          >
            Create
          </button>
        </Modal>
      )}
    </div>
  );
}

function ShopsTab() {
  const { rows, loading, load } = useList(() => api.shops.list({ all: '1', pageSize: 100 }));
  if (loading) return <PageLoader />;
  return (
    <Table
      rows={rows}
      empty="No shops."
      columns={[
        { key: 'shopName', label: 'Shop' },
        { key: 'city', label: 'City', render: (s) => [s.city, s.region].filter(Boolean).join(', ') || '—' },
        { key: 'productCount', label: 'Products' },
        {
          key: 'verified',
          label: 'Verified',
          render: (s) => (
            <button
              onClick={async () => {
                try {
                  await api.shops.adminUpdate(s.id, { verified: !s.verified });
                  load();
                } catch (e) {
                  fail(e);
                }
              }}
              className={s.verified ? 'text-emerald-700' : 'text-neutral-400'}
            >
              {s.verified ? 'Verified' : 'Verify'}
            </button>
          ),
        },
        {
          key: 'active',
          label: 'Active',
          render: (s) => (
            <button
              onClick={async () => {
                try {
                  await api.shops.adminUpdate(s.id, { active: !s.active });
                  load();
                } catch (e) {
                  fail(e);
                }
              }}
              className={s.active ? 'text-emerald-700' : 'text-destructive'}
            >
              {s.active ? 'Active' : 'Hidden'}
            </button>
          ),
        },
      ]}
    />
  );
}

function CategoriesTab() {
  const { rows, loading, load } = useList(() => api.catalog.categories({ all: '1' }));
  const [form, setForm] = useState(null);
  if (loading) return <PageLoader />;
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setForm({ code: '', name: '', slug: '', folder: '', _new: true })}
          className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm"
        >
          Add category
        </button>
      </div>
      <Table
        rows={rows}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'slug', label: 'Slug' },
          { key: 'folder', label: 'Image folder' },
          { key: 'productCount', label: 'Products' },
          { key: 'imageCount', label: 'Images' },
          {
            key: 'active',
            label: 'Active',
            render: (c) => (
              <button
                onClick={async () => {
                  try {
                    await api.catalog.updateCategory(c.id, { active: !c.active });
                    load();
                  } catch (e) {
                    fail(e);
                  }
                }}
                className={c.active ? 'text-emerald-700' : 'text-destructive'}
              >
                {c.active ? 'Active' : 'Hidden'}
              </button>
            ),
          },
        ]}
      />
      {form && (
        <Modal title="New category" onClose={() => setForm(null)}>
          {['code', 'name', 'slug', 'folder'].map((k) => (
            <input
              key={k}
              placeholder={k === 'code' ? 'CODE (UPPER_SNAKE)' : k === 'folder' ? 'jewellery-images/ subfolder' : k}
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm mb-2"
            />
          ))}
          <button
            onClick={async () => {
              try {
                await api.catalog.createCategory({
                  code: form.code, name: form.name, slug: form.slug, folder: form.folder,
                });
                setForm(null);
                load();
              } catch (e) {
                fail(e);
              }
            }}
            className="rounded-full bg-neutral-900 text-white px-5 py-2 text-sm"
          >
            Create
          </button>
        </Modal>
      )}
    </div>
  );
}

function ProductsTab() {
  const { rows, loading, load } = useList(() => api.catalog.list({ all: '1', pageSize: 100 }));
  if (loading) return <PageLoader />;
  return (
    <Table
      rows={rows}
      columns={[
        { key: 'name', label: 'Product' },
        { key: 'category', label: 'Category', render: (p) => p.category?.name },
        { key: 'shop', label: 'Shop', render: (p) => p.shop?.name || '—' },
        { key: 'price', label: 'Price', render: (p) => formatMoney(p.price, p.currency) },
        { key: 'stock', label: 'Stock' },
        { key: 'isPublished', label: 'Live', render: (p) => (p.isPublished ? 'Yes' : 'Draft') },
        {
          key: 'act',
          label: '',
          render: (p) => (
            <button
              onClick={async () => {
                if (!confirm(`Delete "${p.name}"?`)) return;
                try {
                  await api.catalog.remove(p.id);
                  load();
                } catch (e) {
                  fail(e);
                }
              }}
              className="text-neutral-400 hover:text-destructive text-sm"
            >
              Delete
            </button>
          ),
        },
      ]}
    />
  );
}

function OrdersTab() {
  const { rows, loading } = useList(() => api.orders.list({ sort: '-placedAt', pageSize: 100 }));
  if (loading) return <PageLoader />;
  return (
    <Table
      rows={rows}
      empty="No orders."
      columns={[
        { key: 'id', label: 'Order', render: (o) => o.id.slice(-8).toUpperCase() },
        { key: 'placedAt', label: 'Placed', render: (o) => formatDate(o.placedAt) },
        { key: 'shop', label: 'Shop', render: (o) => o.shop?.name },
        { key: 'customer', label: 'Customer', render: (o) => o.customer?.fullName || o.contactName },
        { key: 'total', label: 'Total', render: (o) => formatMoney(o.total, o.currency) },
        { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
      ]}
    />
  );
}

function AppointmentsTab() {
  const { rows, loading } = useList(() => api.appointments.list({ sort: '-date', pageSize: 100 }));
  if (loading) return <PageLoader />;
  return (
    <Table
      rows={rows}
      empty="No appointments."
      columns={[
        { key: 'date', label: 'When', render: (a) => `${formatDate(a.date)} · ${a.timeSlot}` },
        { key: 'shop', label: 'Shop', render: (a) => a.shop?.name },
        { key: 'customerName', label: 'Customer' },
        { key: 'serviceType', label: 'Service', render: (a) => a.serviceType[0] + a.serviceType.slice(1).toLowerCase() },
        { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
      ]}
    />
  );
}

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => {
    Promise.all([
      api.users.list({ pageSize: 1 }),
      api.shops.list({ all: '1', pageSize: 1 }),
      api.catalog.list({ all: '1', pageSize: 1 }),
      api.orders.list({ pageSize: 100 }),
    ]).then(([u, sh, p, o]) => {
      const orders = o.data || [];
      setS({
        users: u.meta.total,
        shops: sh.meta.total,
        products: p.meta.total,
        orders: orders.length,
        revenue: orders.filter((x) => x.status !== 'CANCELLED').reduce((t, x) => t + Number(x.total), 0),
      });
    }).catch(fail);
  }, []);
  if (!s) return <PageLoader />;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard label="Users" value={s.users} />
      <StatCard label="Shops" value={s.shops} />
      <StatCard label="Products" value={s.products} />
      <StatCard label="Orders" value={s.orders} />
      <StatCard label="Revenue" value={formatMoney(s.revenue)} />
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-2xl text-neutral-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');
  return (
    <DashboardShell title="Admin" subtitle="Manage the whole marketplace" tabs={TABS} active={tab} onTab={setTab}>
      {tab === 'Overview' && <Overview />}
      {tab === 'Users' && <UsersTab />}
      {tab === 'Shops' && <ShopsTab />}
      {tab === 'Categories' && <CategoriesTab />}
      {tab === 'Products' && <ProductsTab />}
      {tab === 'Orders' && <OrdersTab />}
      {tab === 'Appointments' && <AppointmentsTab />}
    </DashboardShell>
  );
}
