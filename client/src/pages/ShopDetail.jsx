import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, Clock, BadgeCheck, CalendarCheck2 } from 'lucide-react';
import { api } from '@/api/client';
import { PageLoader, ErrorState } from '@/components/Loading';
import JewelleryGrid from '@/components/jewellery/JewelleryGrid';

const DAYS = [
  ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'],
  ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'],
];

export default function ShopDetail() {
  const { slug } = useParams();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.shops.get(slug).then((r) => setShop(r.data)).catch(setError).finally(() => setLoading(false));
  };
  useEffect(load, [slug]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!shop) return null;

  const hours = shop.openingHours || {};
  const address = [shop.addressLine1, shop.addressLine2, shop.city, shop.region, shop.postalCode, shop.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <Link to="/shops" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-8">
        <ArrowLeft className="w-4 h-4" /> All jewellers
      </Link>

      <div className="grid md:grid-cols-[1fr_300px] gap-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-4xl text-neutral-900">{shop.shopName}</h1>
            {shop.verified && <BadgeCheck className="w-6 h-6 text-gold-700" />}
          </div>
          {shop.description && <p className="text-neutral-600 mt-3 max-w-2xl">{shop.description}</p>}

          <h2 className="font-display text-2xl text-neutral-900 mt-10 mb-4">
            Available jewellery <span className="text-neutral-400 text-lg">({shop.productCount})</span>
          </h2>
          <JewelleryGrid
            products={shop.products}
            emptyMessage="This shop has no published pieces yet."
          />
        </div>

        <aside className="h-max rounded-2xl bg-white border border-neutral-200 p-5 space-y-4 text-sm">
          {address && (
            <div className="flex gap-2.5">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <span className="text-neutral-700">{address}</span>
            </div>
          )}
          {shop.phone && (
            <div className="flex gap-2.5">
              <Phone className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <span className="text-neutral-700">{shop.phone}</span>
            </div>
          )}
          {shop.email && (
            <div className="flex gap-2.5">
              <Mail className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
              <span className="text-neutral-700">{shop.email}</span>
            </div>
          )}

          {Object.keys(hours).length > 0 && (
            <div>
              <p className="flex items-center gap-2 text-neutral-900 font-medium mb-2">
                <Clock className="w-4 h-4 text-neutral-400" /> Opening hours
              </p>
              <ul className="space-y-1">
                {DAYS.map(([k, label]) => (
                  <li key={k} className="flex justify-between text-neutral-600">
                    <span>{label}</span>
                    <span>{hours[k] || '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            to={`/book?shop=${shop.slug}`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 text-white px-5 py-3 text-sm hover:bg-neutral-800"
          >
            <CalendarCheck2 className="w-4 h-4" /> Book an appointment
          </Link>
        </aside>
      </div>
    </div>
  );
}
