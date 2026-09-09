import React from 'react';
import JewelleryCard from './JewelleryCard';

export default function JewelleryGrid({ products, emptyMessage = 'No jewellery available in this category.' }) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-24 text-neutral-500 bg-white border border-dashed border-neutral-200 rounded-2xl">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {products.map((p) => (
        <JewelleryCard key={p.id} product={p} />
      ))}
    </div>
  );
}
