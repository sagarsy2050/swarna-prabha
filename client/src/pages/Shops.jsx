import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck, Search } from 'lucide-react';
import { api } from '@/api/client';
import { PageLoader, ErrorState } from '@/components/Loading';

export default function Shops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  const load = (query) => {
    setLoading(true);
    setError(null);
    api.shops
      .list(query ? { q: query } : undefined)
      .then((r) => setShops(r.data || []))
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <p className="text-gold-700 text-xs tracking-[0.25em] uppercase mb-2">Swarna Prabha</p>
      <h1 className="font-display text-4xl sm:text-5xl text-neutral-900">Find a jeweller</h1>
      <p className="text-neutral-600 mt-2 max-w-2xl">
        Browse verified jewellery shops, see what they stock, and book a visit.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q.trim());
        }}
        className="mt-6 flex gap-2 max-w-md"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Shop name or city…"
            className="w-full rounded-full border border-neutral-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          />
        </div>
        <button className="rounded-full bg-neutral-900 text-white px-5 text-sm">Search</button>
      </form>

      <div className="mt-10">
        {loading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={() => load(q.trim())} />
        ) : shops.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 bg-white border border-dashed border-neutral-200 rounded-2xl">
            No shops found.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shops.map((s) => (
              <Link
                key={s.id}
                to={`/shops/${s.slug}`}
                className="group bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between">
                  <h2 className="font-display text-2xl text-neutral-900">{s.shopName}</h2>
                  {s.verified && (
                    <span title="Verified" className="text-gold-700">
                      <BadgeCheck className="w-5 h-5" />
                    </span>
                  )}
                </div>
                {(s.city || s.region) && (
                  <p className="text-sm text-neutral-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {[s.city, s.region].filter(Boolean).join(', ')}
                  </p>
                )}
                {s.description && (
                  <p className="text-sm text-neutral-600 mt-3 line-clamp-2">{s.description}</p>
                )}
                <p className="text-xs text-gold-700 mt-4">{s.productCount} pieces in stock →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
