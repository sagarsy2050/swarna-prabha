import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { formatMoney } from '@/lib/utils';

const FIELDS = [
  ['contactName', 'Full name', 'text', true],
  ['contactPhone', 'Phone', 'tel', true],
  ['line1', 'Address line 1', 'text', true],
  ['line2', 'Address line 2', 'text', false],
  ['city', 'City', 'text', true],
  ['region', 'State / region', 'text', false],
  ['postalCode', 'Postal code', 'text', true],
  ['country', 'Country', 'text', true],
];

export default function Checkout() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    contactName: user?.fullName || '',
    contactPhone: '',
    line1: '', line2: '', city: '', region: '', postalCode: '', country: 'India',
  });
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (cart.items.length === 0 && !placing) {
    return (
      <div className="max-w-lg mx-auto text-center py-28">
        <p className="text-neutral-500">Your cart is empty.</p>
        <Link to="/catalog" className="inline-block mt-4 text-gold-700 underline">Browse jewellery</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setPlacing(true);
    try {
      const { data } = await api.orders.checkout({
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        shippingAddress: {
          line1: form.line1, line2: form.line2 || undefined, city: form.city,
          region: form.region || undefined, postalCode: form.postalCode, country: form.country,
        },
      });
      await refresh();
      const ids = data.map((o) => o.id);
      navigate(ids.length === 1 ? `/my-orders/${ids[0]}` : '/my-orders', {
        replace: true,
        state: { justOrdered: ids },
      });
    } catch (err) {
      setError(err.message || 'Could not place the order');
      setPlacing(false);
    }
  };

  const shopCount = new Set(cart.items.map((i) => i.shop?.name)).size;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12">
      <h1 className="font-display text-4xl text-neutral-900 mb-8">Checkout</h1>

      <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
        <form onSubmit={submit} className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-2xl text-neutral-900">Contact &amp; delivery</h2>
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            {FIELDS.map(([k, label, type, required]) => (
              <label key={k} className={k === 'line1' || k === 'line2' ? 'sm:col-span-2 block' : 'block'}>
                <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">
                  {label}
                  {required && ' *'}
                </span>
                <input
                  type={type}
                  required={required}
                  value={form[k]}
                  onChange={set(k)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={placing}
            className="w-full rounded-full bg-neutral-900 text-white px-6 py-3.5 text-sm hover:bg-neutral-800 disabled:opacity-40"
          >
            {placing ? 'Placing order…' : 'Place order'}
          </button>
          <p className="text-xs text-neutral-400 text-center">
            No payment is taken now. The jeweller confirms the order and arranges payment &amp; handover with you.
          </p>
        </form>

        <aside className="bg-white border border-neutral-200 rounded-2xl p-5">
          <h3 className="font-display text-xl text-neutral-900 mb-3">Order summary</h3>
          <ul className="space-y-2 text-sm">
            {cart.items.map((it) => (
              <li key={it.productId} className="flex justify-between gap-3">
                <span className="text-neutral-600">
                  {it.name} × {it.quantity}
                </span>
                <span className="text-neutral-900 whitespace-nowrap">
                  {formatMoney(it.livePrice * it.quantity, cart.currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-neutral-200 mt-3 pt-3 flex justify-between font-display text-lg">
            <span>Total</span>
            <span>{formatMoney(cart.items.reduce((s, i) => s + i.livePrice * i.quantity, 0), cart.currency)}</span>
          </div>
          {shopCount > 1 && (
            <p className="text-xs text-neutral-400 mt-2">
              Items are from {shopCount} shops — this creates {shopCount} separate orders.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
