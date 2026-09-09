import React from 'react';
import { titleCase } from '@/lib/utils';

const TONES = {
  // neutral / pending
  pending: 'bg-neutral-100 text-neutral-600',
  draft: 'bg-neutral-100 text-neutral-600',
  queued: 'bg-neutral-100 text-neutral-600',
  scheduled: 'bg-gold-50 text-gold-700',
  sent: 'bg-gold-50 text-gold-700',
  in_review: 'bg-gold-50 text-gold-700',
  quoted: 'bg-gold-50 text-gold-700',
  processing: 'bg-gold-50 text-gold-700',
  pending_payment: 'bg-gold-50 text-gold-700',
  in_production: 'bg-blue-50 text-blue-700',
  quality_check: 'bg-blue-50 text-blue-700',
  in_transit: 'bg-blue-50 text-blue-700',
  // positive
  approved: 'bg-emerald-50 text-emerald-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  succeeded: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-emerald-50 text-emerald-700',
  ordered: 'bg-emerald-50 text-emerald-700',
  ready_for_handover: 'bg-emerald-50 text-emerald-700',
  handed_over: 'bg-emerald-50 text-emerald-700',
  done: 'bg-emerald-50 text-emerald-700',
  // caution
  needs_modification: 'bg-amber-50 text-amber-700',
  NEEDS_MODIFICATION: 'bg-amber-50 text-amber-700',
  // negative
  rejected: 'bg-rose-50 text-rose-700',
  REJECTED: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-rose-50 text-rose-700',
  failed: 'bg-rose-50 text-rose-700',
  not_feasible: 'bg-rose-50 text-rose-700',
  refunded: 'bg-rose-50 text-rose-700',
};

export default function StatusBadge({ status, className = '' }) {
  const tone = TONES[status] || 'bg-neutral-100 text-neutral-600';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${tone} ${className}`}>
      {titleCase(String(status || 'unknown'))}
    </span>
  );
}
