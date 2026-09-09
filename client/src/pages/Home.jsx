import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gem, Store, CalendarCheck2, ShoppingBag, ArrowRight } from 'lucide-react';
import { api } from '@/api/client';
import ProductImage from '@/components/jewellery/ProductImage';
import { formatMoney } from '@/lib/utils';

const ACTIONS = [
  { icon: Gem, title: 'Explore Jewellery', desc: 'Browse rings, earrings, necklaces, bangles and more — by category.', to: '/catalog' },
  { icon: Store, title: 'Find Jewellers', desc: 'Discover verified jewellery shops near you and see what they stock.', to: '/shops' },
  { icon: CalendarCheck2, title: 'Book an Appointment', desc: 'Reserve a time to view a piece or consult a jeweller in person.', to: '/shops' },
  { icon: ShoppingBag, title: 'Shop Online', desc: 'Add to cart and check out — orders you can track to your door.', to: '/catalog' },
];

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.catalog.categories().then((r) => setCategories(r.data || [])).catch(() => {});
    api.catalog.list({ pageSize: 8, sort: '-createdAt' }).then((r) => setFeatured(r.data || [])).catch(() => {});
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-b from-gold-50/60 to-white border-b border-neutral-200/70">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-28 pb-16 text-center">
          <p className="text-gold-700 text-xs tracking-[0.3em] uppercase mb-4">Swarna Prabha</p>
          <h1 className="font-display text-4xl sm:text-6xl text-neutral-900 leading-tight">
            A simple jewellery marketplace.
          </h1>
          <p className="mt-4 text-neutral-600 max-w-xl mx-auto">
            Choose a jewellery type, see only genuine pieces from that category, find the jeweller,
            and buy online or book a visit. No guesswork.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/catalog" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-6 py-3 text-sm hover:bg-neutral-800">
              Explore the collection <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/shops" className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm hover:border-neutral-400">
              Find jewellers
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACTIONS.map((a) => (
            <Link
              key={a.title}
              to={a.to}
              className="group rounded-2xl border border-neutral-200 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <span className="inline-flex w-11 h-11 rounded-xl bg-gold-50 group-hover:bg-gold-100 items-center justify-center">
                <a.icon className="w-5 h-5 text-gold-700" />
              </span>
              <h3 className="font-display text-xl text-neutral-900 mt-4">{a.title}</h3>
              <p className="text-sm text-neutral-500 mt-1.5">{a.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16">
          <h2 className="font-display text-3xl text-neutral-900 mb-6">Shop by category</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/catalog/${c.slug}`}
                className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm hover:border-neutral-400"
              >
                {c.name}
                <span className="ml-2 text-xs text-neutral-400">{c.productCount}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20">
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-3xl text-neutral-900">New in</h2>
            <Link to="/catalog" className="text-sm text-gold-700 underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.slice(0, 8).map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="group block">
                <ProductImage image={p.primaryImage} alt={p.name} ratio="aspect-[4/5]" className="rounded-xl" />
                <p className="font-display text-lg text-neutral-900 mt-2">{p.name}</p>
                <p className="text-sm text-neutral-500">{formatMoney(p.price, p.currency)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
