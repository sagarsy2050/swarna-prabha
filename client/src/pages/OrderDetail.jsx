import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { api } from '@/api/client';
import { PageLoader, ErrorState } from '@/components/Loading';
import StatusBadge from '@/components/StatusBadge';
import { assetUrl, formatMoney, formatDate } from '@/lib/utils';

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED'];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.orders.get(id).then((r) => setOrder(r.data)).catch(setError).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!order) return null;

  const cancelled = order.status === 'CANCELLED';
  const stepIdx = FLOW.indexOf(order.status);
  const addr = order.shippingAddress || {};

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
      <Link to="/my-orders" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-8">
        <ArrowLeft className="w-4 h-4" /> My orders
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl text-neutral-900">Order {order.id.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {formatDate(order.placedAt)} · {order.shop?.name}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* progress */}
      {!cancelled && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 mb-6">
          <ol className="flex items-center justify-between">
            {FLOW.map((s, i) => (
              <li key={s} className="flex-1 flex flex-col items-center text-center">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    i <= stepIdx ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {i <= stepIdx ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className={`mt-1.5 text-[10px] ${i <= stepIdx ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {s[0] + s.slice(1).toLowerCase()}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {cancelled && (
        <div className="bg-rose-50 text-rose-700 rounded-2xl p-4 mb-6 text-sm">This order was cancelled.</div>
      )}

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
        {order.items.map((it) => (
          <div key={it.id} className="flex gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
              {it.imageUrl && <img src={assetUrl(it.imageUrl)} alt={it.nameSnapshot} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 flex justify-between">
              <div>
                <p className="font-display text-lg text-neutral-900">{it.nameSnapshot}</p>
                <p className="text-sm text-neutral-500">Qty {it.quantity} · {formatMoney(it.unitPrice, order.currency)} each</p>
              </div>
              <p className="font-display text-lg text-neutral-900">{formatMoney(it.lineTotal, order.currency)}</p>
            </div>
          </div>
        ))}
        <div className="border-t border-neutral-200 pt-3 flex justify-between font-display text-xl">
          <span>Total</span>
          <span>{formatMoney(order.total, order.currency)}</span>
        </div>
        <p className="text-xs text-neutral-400">
          Payment: {order.payment?.status?.toLowerCase() || 'pending'} · settled directly with the jeweller.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 mt-4 text-sm">
        <p className="font-medium text-neutral-900 mb-1">Delivery to</p>
        <p className="text-neutral-600">
          {order.contactName} · {order.contactPhone}
          <br />
          {[addr.line1, addr.line2, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ')}
        </p>
      </div>
    </div>
  );
}
