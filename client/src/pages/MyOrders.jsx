import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { api } from '@/api/client';
import { PageLoader, ErrorState } from '@/components/Loading';
import StatusBadge from '@/components/StatusBadge';
import { assetUrl, formatMoney, formatDate } from '@/lib/utils';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.orders
      .list({ sort: '-placedAt', pageSize: 50 })
      .then((r) => setOrders(r.data || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12">
      <h1 className="font-display text-4xl text-neutral-900 mb-8">My orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-neutral-500 bg-white border border-dashed border-neutral-200 rounded-2xl">
          <Package className="w-9 h-9 text-neutral-300 mx-auto mb-3" />
          You haven&apos;t placed any orders yet.
          <div className="mt-4">
            <Link to="/catalog" className="text-gold-700 underline">
              Browse jewellery
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              to={`/my-orders/${o.id}`}
              className="block bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-neutral-400">
                    {formatDate(o.placedAt)} · {o.shop?.name || 'Shop'}
                  </p>
                  <p className="font-display text-xl text-neutral-900 mt-0.5">
                    {formatMoney(o.total, o.currency)}
                    <span className="text-sm text-neutral-400 font-body ml-2">
                      {o.items.length} item{o.items.length === 1 ? '' : 's'}
                    </span>
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex gap-2 mt-4">
                {o.items.slice(0, 5).map((it) => (
                  <div key={it.id} className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100">
                    {it.imageUrl && (
                      <img
                        src={assetUrl(it.imageUrl)}
                        alt={it.nameSnapshot}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
