import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { PageLoader, ErrorState } from '@/components/Loading';

const SERVICE_TYPES = [
  ['CONSULTATION', 'Consultation'],
  ['VIEWING', 'View a piece'],
  ['FITTING', 'Fitting'],
  ['VALUATION', 'Valuation'],
  ['OTHER', 'Other'],
];

function nextDays(n) {
  const out = [];
  const d = new Date();
  for (let i = 1; out.length < n; i += 1) {
    const c = new Date(d);
    c.setDate(d.getDate() + i);
    out.push(c.toISOString().slice(0, 10));
  }
  return out;
}

export default function BookAppointment() {
  const [params] = useSearchParams();
  const shopSlug = params.get('shop');
  const productId = params.get('product');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [shop, setShop] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState('');
  const [serviceType, setServiceType] = useState(productId ? 'VIEWING' : 'CONSULTATION');
  const [name, setName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const dates = useMemo(() => nextDays(14), []);

  useEffect(() => {
    if (!shopSlug) {
      setLoadErr(new Error('No shop selected. Pick a jeweller first.'));
      return;
    }
    api.shops.get(shopSlug).then((r) => setShop(r.data)).catch(setLoadErr);
  }, [shopSlug]);

  useEffect(() => {
    if (!shop || !date) return;
    setSlots(null);
    setSlot('');
    api.appointments
      .availability(shop.jewellerId, date)
      .then((r) => setSlots(r.data.slots || []))
      .catch(() => setSlots([]));
  }, [shop, date]);

  if (loadErr) return <ErrorState error={loadErr} />;
  if (!shop) return <PageLoader />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.appointments.book({
        jewellerId: shop.jewellerId,
        productId: productId || undefined,
        serviceType,
        date,
        timeSlot: slot,
        customerName: name,
        customerPhone: phone,
        notes: notes || undefined,
      });
      navigate('/appointments', { replace: true, state: { booked: data.id } });
    } catch (err) {
      setError(err.message || 'Could not book that slot');
      // refresh slots — it may have just been taken
      if (shop && date) api.appointments.availability(shop.jewellerId, date).then((r) => setSlots(r.data.slots || []));
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12">
      <h1 className="font-display text-4xl text-neutral-900">Book an appointment</h1>
      <p className="text-neutral-600 mt-2">
        at <Link to={`/shops/${shop.slug}`} className="text-gold-700 underline">{shop.shopName}</Link>
        {shop.city ? `, ${shop.city}` : ''}
      </p>

      <form onSubmit={submit} className="mt-8 bg-white border border-neutral-200 rounded-2xl p-6 space-y-5">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <label className="block">
          <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Service</span>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            {SERVICE_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Date</span>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="">Choose a date…</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </option>
            ))}
          </select>
        </label>

        {date && (
          <div>
            <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-2">Time</span>
            {slots === null ? (
              <p className="text-sm text-neutral-400">Checking availability…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-neutral-500">This shop has no slots on that day. Try another date.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setSlot(s.time)}
                    className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                      slot === s.time
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : s.available
                          ? 'bg-white border-neutral-200 hover:border-neutral-400'
                          : 'bg-neutral-50 border-neutral-100 text-neutral-300 line-through cursor-not-allowed'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Your name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Phone *</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        </label>

        <button
          type="submit"
          disabled={busy || !slot}
          className="w-full rounded-full bg-neutral-900 text-white px-6 py-3.5 text-sm hover:bg-neutral-800 disabled:opacity-40"
        >
          {busy ? 'Booking…' : 'Request appointment'}
        </button>
        <p className="text-xs text-neutral-400 text-center">
          The jeweller confirms or declines your request — you&apos;ll see the status under Appointments.
        </p>
      </form>
    </div>
  );
}
