import React, { useState } from 'react';
import { X } from 'lucide-react';

/** Shown on the static (GitHub Pages) build — browsing only, no backend. */
export default function DemoBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="bg-neutral-900 text-white text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-2 flex items-center gap-3">
        <span className="flex-1">
          <strong className="font-medium">Read-only demo.</strong> Browse the catalogue, categories,
          filters and shops. Accounts, cart, checkout, appointments and the dashboards need the
          backend — run the app locally (see the{' '}
          <a
            href="https://github.com/sagarsy2050/swarna-prabha#quick-start"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            README
          </a>
          ).
        </span>
        <button onClick={() => setOpen(false)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
