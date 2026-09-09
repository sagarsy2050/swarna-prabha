import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { api } from '@/api/client';
import { PageLoader, ErrorState } from '@/components/Loading';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';

export default function Appointments() {
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.appointments
      .list({ sort: '-date', pageSize: 50 })
      .then((r) => setAppts(r.data || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const cancel = async (id) => {
    setBusy(id);
    try {
      await api.appointments.cancel(id);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={load} />;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
      <h1 className="font-display text-4xl text-neutral-900 mb-8">My appointments</h1>

      {appts.length === 0 ? (
        <div className="text-center py-20 text-neutral-500 bg-white border border-dashed border-neutral-200 rounded-2xl">
          <CalendarClock className="w-9 h-9 text-neutral-300 mx-auto mb-3" />
          No appointments yet.
          <div className="mt-4">
            <Link to="/shops" className="text-gold-700 underline">Find a jeweller to visit</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {appts.map((a) => {
            const canCancel = ['PENDING', 'CONFIRMED'].includes(a.status);
            return (
              <div key={a.id} className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-xl text-neutral-900">
                      {formatDate(a.date)} · {a.timeSlot}
                    </p>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {a.serviceType[0] + a.serviceType.slice(1).toLowerCase()} at{' '}
                      {a.shop?.slug ? (
                        <Link to={`/shops/${a.shop.slug}`} className="text-gold-700 hover:underline">
                          {a.shop.name}
                        </Link>
                      ) : (
                        a.shop?.name || 'shop'
                      )}
                    </p>
                    {a.product?.name && (
                      <p className="text-xs text-neutral-400 mt-1">Re: {a.product.name}</p>
                    )}
                    {a.notes && <p className="text-xs text-neutral-400 mt-1">“{a.notes}”</p>}
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                {canCancel && (
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <button
                      disabled={busy === a.id}
                      onClick={() => cancel(a.id)}
                      className="text-sm text-neutral-500 hover:text-destructive disabled:opacity-40"
                    >
                      Cancel appointment
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
