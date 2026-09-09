import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Category chips. `all` selects every category; a category with zero images is
 * still shown (it renders the empty-state message) so the taxonomy stays honest.
 */
export default function JewelleryCategorySelector({ categories, value, onChange }) {
  const chip = (active) =>
    cn(
      'px-4 py-2 rounded-full text-sm transition-colors border',
      active
        ? 'bg-neutral-900 text-white border-neutral-900'
        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300',
    );

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={chip(!value)} onClick={() => onChange(null)}>
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={chip(value === c.slug)}
          onClick={() => onChange(c.slug)}
          title={c.productCount === 0 ? 'No jewellery available yet' : undefined}
        >
          {c.name}
          {typeof c.productCount === 'number' && (
            <span className="ml-1.5 text-xs opacity-60">{c.productCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}
