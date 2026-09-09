import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';

const TITLES = {
  '/shops': 'Jeweller discovery',
  '/cart': 'Your cart',
  '/checkout': 'Checkout',
  '/book': 'Appointment booking',
};

/**
 * Honest placeholder for sections that land in Phase 3 (shops, cart, checkout,
 * booking UI). Not a 404 — the feature is planned and the route is reserved.
 */
export default function ComingSoon() {
  const { pathname } = useLocation();
  const key = Object.keys(TITLES).find((k) => pathname.startsWith(k));
  const title = TITLES[key] || 'This section';

  return (
    <div className="max-w-lg mx-auto text-center py-28 px-6">
      <span className="inline-flex w-12 h-12 rounded-xl bg-gold-50 items-center justify-center">
        <Hammer className="w-5 h-5 text-gold-700" />
      </span>
      <h1 className="font-display text-3xl text-neutral-900 mt-5">{title} is on the way</h1>
      <p className="text-neutral-600 mt-2">
        This part of Swarna Prabha is being built in the next update. Browsing, product
        details and appointment availability are already live.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/catalog" className="rounded-full bg-neutral-900 text-white px-6 py-3 text-sm hover:bg-neutral-800">
          Browse jewellery
        </Link>
        <Link to="/" className="rounded-full border border-neutral-300 px-6 py-3 text-sm hover:border-neutral-400">
          Go home
        </Link>
      </div>
    </div>
  );
}
