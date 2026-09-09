import React from 'react';
import { cn } from '@/lib/utils';

export function DashboardShell({ title, subtitle, tabs, active, onTab, children }) {
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <h1 className="font-display text-4xl text-neutral-900">{title}</h1>
      {subtitle && <p className="text-neutral-500 mt-1">{subtitle}</p>}

      <div className="flex flex-wrap gap-1.5 mt-6 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className={cn(
              'px-4 py-2 text-sm rounded-t-lg -mb-px border-b-2 transition-colors',
              active === t
                ? 'border-neutral-900 text-neutral-900 font-medium'
                : 'border-transparent text-neutral-500 hover:text-neutral-800',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}

export function Table({ columns, rows, empty = 'Nothing here yet.' }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500 bg-white border border-dashed border-neutral-200 rounded-2xl">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto bg-white border border-neutral-200 rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-400 border-b border-neutral-100">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} className="border-b border-neutral-50 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 align-middle">
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="font-display text-3xl text-neutral-900 mt-1">{value}</p>
    </div>
  );
}

export default DashboardShell;
