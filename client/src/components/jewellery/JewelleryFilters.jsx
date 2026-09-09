import React from 'react';
import { formatMoney } from '@/lib/utils';

const AVAILABILITY = [
  ['', 'Any availability'],
  ['IN_STOCK', 'In stock'],
  ['MADE_TO_ORDER', 'Made to order'],
];

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Deterministic DB-backed filters. `facets` supplies the distinct values present
 * in the current category (or the whole catalogue). No AI, no recommendation.
 */
export default function JewelleryFilters({ facets, value, onChange, onReset }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const opt = (arr) => [['', 'Any'], ...(arr || []).map((v) => [v, v])];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-neutral-900">Filters</h3>
        <button type="button" onClick={onReset} className="text-xs text-gold-700 underline">
          Clear all
        </button>
      </div>

      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Search</span>
        <input
          type="search"
          value={value.q || ''}
          onChange={(e) => set({ q: e.target.value || undefined })}
          placeholder="Name, metal, stone…"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        />
      </label>

      <Select label="Metal" value={value.metal} onChange={(v) => set({ metal: v })} options={opt(facets?.metal)} />
      <Select label="Purity" value={value.purity} onChange={(v) => set({ purity: v })} options={opt(facets?.purity)} />
      <Select label="Stone" value={value.stone} onChange={(v) => set({ stone: v })} options={opt(facets?.stone)} />
      <Select
        label="Availability"
        value={value.availability}
        onChange={(v) => set({ availability: v })}
        options={AVAILABILITY}
      />

      <div>
        <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Price range
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder={facets ? String(Math.floor(facets.priceMin)) : 'Min'}
            value={value.priceMin ?? ''}
            onChange={(e) => set({ priceMin: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
          />
          <span className="text-neutral-400">–</span>
          <input
            type="number"
            min={0}
            placeholder={facets ? String(Math.ceil(facets.priceMax)) : 'Max'}
            value={value.priceMax ?? ''}
            onChange={(e) => set({ priceMax: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
          />
        </div>
        {facets && (
          <p className="text-[11px] text-neutral-400 mt-1">
            {formatMoney(facets.priceMin)} – {formatMoney(facets.priceMax)} in this selection
          </p>
        )}
      </div>

      <div>
        <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Weight (grams)
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="0.1"
            placeholder="Min"
            value={value.weightMin ?? ''}
            onChange={(e) => set({ weightMin: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
          />
          <span className="text-neutral-400">–</span>
          <input
            type="number"
            min={0}
            step="0.1"
            placeholder="Max"
            value={value.weightMax ?? ''}
            onChange={(e) => set({ weightMax: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
