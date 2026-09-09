import React from 'react';
import { titleCase } from '@/lib/utils';

// keyed by lowercased status
const TONES = {
  pending: 'bg-neutral-100 text-neutral-600',
  confirmed: 'bg-gold-50 text-gold-700',
  processing: 'bg-blue-50 text-blue-700',
  ready: 'bg-blue-50 text-blue-700',
  shipped: 'bg-blue-50 text-blue-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
  rejected: 'bg-rose-50 text-rose-700',
  failed: 'bg-rose-50 text-rose-700',
  refunded: 'bg-rose-50 text-rose-700',
  in_stock: 'bg-emerald-50 text-emerald-700',
  made_to_order: 'bg-gold-50 text-gold-700',
  unavailable: 'bg-rose-50 text-rose-700',
};

export default function StatusBadge({ status, className = '' }) {
  const key = String(status || 'unknown').toLowerCase();
  const tone = TONES[key] || 'bg-neutral-100 text-neutral-600';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${tone} ${className}`}>
      {titleCase(key)}
    </span>
  );
}
