import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, AlertTriangle } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { assetUrl, formatMoney } from '@/lib/utils';

export default function Cart() {
  const { cart, setQuantity, loading } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);

  const change = async (productId, qty) => {
    setBusy(productId);
    try {
      await setQuantity(productId, qty);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!loading && cart.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-28 px-6">
        <ShoppingBag className="w-10 h-10 text-neutral-300 mx-auto" />
        <h1 className="font-display text-3xl text-neutral-900 mt-4">Your cart is empty</h1>
        <p className="text-neutral-500 mt-2">Add a piece from the collection to get started.</p>
        <Link to="/catalog" className="inline-block mt-6 rounded-full bg-neutral-900 text-white px-6 py-3 text-sm">
          Browse jewellery
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12">
      <h1 className="font-display text-4xl text-neutral-900 mb-8">Your cart</h1>

      <div className="space-y-4">
        {cart.items.map((it) => (
          <div
            key={it.productId}
            className="flex gap-4 bg-white border border-neutral-200 rounded-2xl p-4"
          >
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
              {it.image && (
                <img src={assetUrl(it.image)} alt={it.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-3">
                <Link to={`/product/${it.productId}`} className="font-display text-xl text-neutral-900 hover:underline">
                  {it.name}
                </Link>
                <span className="font-display text-lg text-neutral-900 whitespace-nowrap">
                  {formatMoney(it.lineTotal, cart.currency)}
                </span>
              </div>
              {it.shop && <p className="text-xs text-neutral-400 mt-0.5">{it.shop.name}</p>}
              {it.priceChanged && (
                <p className="text-xs text-amber-600 mt-1">
                  Price updated to {formatMoney(it.livePrice, cart.currency)} — will apply at checkout.
                </p>
              )}
              {!it.inStock && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Only {it.stock} available — reduce quantity to check out.
                </p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <div className="inline-flex items-center border border-neutral-200 rounded-full">
                  <button
                    disabled={busy === it.productId}
                    onClick={() => change(it.productId, it.quantity - 1)}
                    className="p-2 disabled:opacity-40"
                    aria-label="Decrease"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm">{it.quantity}</span>
                  <button
                    disabled={busy === it.productId}
                    onClick={() => change(it.productId, it.quantity + 1)}
                    className="p-2 disabled:opacity-40"
                    aria-label="Increase"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => change(it.productId, 0)}
                  className="text-neutral-400 hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="flex justify-between text-lg">
          <span className="text-neutral-600">Subtotal ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'})</span>
          <span className="font-display text-neutral-900">{formatMoney(cart.subtotal, cart.currency)}</span>
        </div>
        {cart.hasBlockingIssue && (
          <p className="text-sm text-destructive mt-2">
            Resolve the stock issue above before checking out.
          </p>
        )}
        <button
          disabled={cart.hasBlockingIssue || loading}
          onClick={() => navigate('/checkout')}
          className="w-full mt-4 rounded-full bg-neutral-900 text-white px-6 py-3.5 text-sm hover:bg-neutral-800 disabled:opacity-40"
        >
          Proceed to checkout
        </button>
        <p className="text-xs text-neutral-400 text-center mt-2">
          Orders are settled directly with the jeweller — no card is charged here.
        </p>
      </div>
    </div>
  );
}
