import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { PageLoader, ErrorState } from '@/components/Loading';
import { api } from '@/api/client';
import { formatMoney, formatDate } from '@/lib/utils';

export default function MyOrders() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.orders
      .list({ sort: '-createdAt', pageSize: 50 })
      .then((res) => setItems(res.data || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <h1 className="font-display text-4xl sm:text-5xl text-neutral-900 mb-2">Orders</h1>
      <p className="text-neutral-500 mb-10">Payment, production, quality checks and handover.</p>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200 text-neutral-500">
          No orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((o) => (
            <Link
              key={o.id}
              to={`/my-orders/${o.id}`}
              className="block bg-white rounded-2xl border border-neutral-200 p-6 hover:border-neutral-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-neutral-400">#{o.id.slice(-8)}</p>
                  <p className="font-display text-2xl text-neutral-900 mt-1">{formatMoney(o.total, o.currency)}</p>
                  <p className="text-sm text-neutral-500">Placed {formatDate(o.createdAt)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
