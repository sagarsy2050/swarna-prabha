import React from 'react';
import { Link } from 'react-router-dom';
import ProductImage from './ProductImage';
import { formatMoney, titleCase } from '@/lib/utils';

const AVAIL_LABEL = {
  IN_STOCK: null,
  MADE_TO_ORDER: 'Made to order',
  UNAVAILABLE: 'Currently unavailable',
};

export default function JewelleryCard({ product }) {
  const outOfStock =
    product.availability === 'UNAVAILABLE' ||
    (product.availability === 'IN_STOCK' && product.stock === 0);
  const badge = outOfStock ? 'Currently unavailable' : AVAIL_LABEL[product.availability];

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-neutral-200 hover:shadow-xl hover:shadow-neutral-200/60 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        <ProductImage image={product.primaryImage} alt={product.name} ratio="aspect-square" />
        {badge && (
          <span className="absolute top-3 left-3 text-[10px] font-medium tracking-wide uppercase bg-white/95 text-neutral-600 rounded-full px-2.5 py-1 shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] tracking-[0.15em] uppercase text-gold-700">
            {product.category?.name || titleCase(product.category?.code || '')}
          </span>
          <span className="font-display text-lg text-neutral-900">
            {formatMoney(product.price, product.currency)}
          </span>
        </div>
        <h3 className="font-display text-xl text-neutral-900 mt-0.5 leading-snug">{product.name}</h3>
        <p className="text-sm text-neutral-500 mt-1 line-clamp-1">
          {[product.purity, product.metal, product.stone].filter(Boolean).join(' · ')}
        </p>
        {product.shop && (
          <p className="text-xs text-neutral-400 mt-auto pt-2">
            {product.shop.name}
            {product.shop.city ? ` · ${product.shop.city}` : ''}
          </p>
        )}
      </div>
    </Link>
  );
}
