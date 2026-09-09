import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { PageLoader, ErrorState } from '@/components/Loading';
import { toast } from '@/components/ui/sonner';
import { api } from '@/api/client';
import { formatMoney, formatDate, titleCase } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const STEPS = ['pending_payment', 'paid', 'in_production', 'quality_check', 'ready_for_handover', 'completed'];

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api.orders
      .get(id)
      .then((res) => setOrder(res.data))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const pay = async () => {
    setPaying(true);
    try {
      const { data } = await api.payments.initiate({ orderId: id });
      toast(data.instructions || 'Payment initiated. A jeweller will confirm receipt.');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!order) return null;

  const stepIndex = STEPS.indexOf(order.status);
  const outstanding =
    Number(order.total) -
    (order.payments || []).filter((p) => p.status === 'succeeded').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
      <Link to="/my-orders" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> All orders
      </Link>

      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <p className="font-mono text-xs text-neutral-400">#{order.id.slice(-8)}</p>
          <h1 className="font-display text-4xl text-neutral-900 mt-1">{formatMoney(order.total, order.currency)}</h1>
          <p className="text-sm text-neutral-500">Placed {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* progress */}
      <ol className="flex flex-wrap gap-2 mb-8">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              i <= stepIndex && order.status !== 'cancelled'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-400 border-neutral-200'
            }`}
          >
            {titleCase(s)}
          </li>
        ))}
      </ol>

      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-3">
        <h2 className="font-display text-xl text-neutral-900">Items</h2>
        <ul className="text-sm text-neutral-600 space-y-1">
          {(order.items || []).map((li, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {li.label} × {li.quantity ?? 1}
              </span>
              <span>{formatMoney((li.quantity ?? 1) * (li.unitPrice ?? 0), order.currency)}</span>
            </li>
          ))}
        </ul>
      </div>

      {order.status === 'pending_payment' && user?.role === 'CUSTOMER' && (
        <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-display text-xl text-neutral-900 mb-1">Payment</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Outstanding: {formatMoney(outstanding, order.currency)}. This platform records the payment and a
            jeweller confirms receipt — nothing is auto-charged.
          </p>
          <Button onClick={pay} disabled={paying} className="bg-gold-500 hover:bg-gold-400 text-neutral-900">
            {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
            Initiate payment
          </Button>
        </div>
      )}

      {(order.payments || []).length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-display text-xl text-neutral-900 mb-3">Payments</h2>
          <ul className="text-sm space-y-2">
            {order.payments.map((p) => (
              <li key={p.id} className="flex justify-between items-center">
                <span className="text-neutral-600">
                  {formatMoney(p.amount, p.currency)} · {p.provider}
                  {p.providerRef ? ` · ${p.providerRef}` : ''}
                </span>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.production && (
        <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-display text-xl text-neutral-900 mb-1">Production</h2>
          <p className="text-sm text-neutral-600">
            Stage: <StatusBadge status={order.production.stage} />
          </p>
          {order.production.notes && <p className="text-xs text-neutral-500 mt-2">{order.production.notes}</p>}
        </div>
      )}

      {order.delivery && (
        <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="font-display text-xl text-neutral-900 mb-1">Delivery</h2>
          <p className="text-sm text-neutral-600">
            {titleCase(order.delivery.method)} · <StatusBadge status={order.delivery.status} />
          </p>
          {order.delivery.deliveredAt && (
            <p className="text-xs text-neutral-500 mt-2">Handed over {formatDate(order.delivery.deliveredAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}
